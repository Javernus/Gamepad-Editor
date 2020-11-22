const express = require('express')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const joinpath = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');
const zip = require('zip-a-folder');

const RX_GAME_PATHS = /Game(\d+)=(.*)/

let argv = process.argv.slice(2);

app.use(express.static(joinpath.join(__dirname, '../@Resources/')));
app.use(express.static(joinpath.join(__dirname, '/CSS/')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Editor.html');
});

let GamePaths;
let ImagePaths;
let UnusedImagePaths;

io.on('connection', socket => {
    setup();

    socket.on('resetLauncher', () => {
        setup();
    })
    
    socket.on('requestImage', number => {
        if (!number) return;
        
        for (let path of UnusedImagePaths) { if (!path.fromPad && path.newPath.startsWith(`${number.toString()}.`)) { UnusedImagePaths.splice(UnusedImagePaths.indexOf(path), 1); } }
        let imagePath = '';
        for (let path of ImagePaths) {
            if (path.newPath.startsWith(`${number.toString()}.`)) {
                imagePath = path.path;
            }
        }
        
        let gamePath = '';
        if (!!GamePaths[number - 1]) { gamePath = GamePaths[number - 1].startsWith('"') ? GamePaths[number - 1].slice(1, GamePaths[number - 1].length - 1) : GamePaths[number - 1]; }
        
        socket.emit('getImage', imagePath, number, gamePath);
    });

    socket.on('requestPathOf', number => {
        socket.emit('getPathOf', GamePaths[number - 1]);
    })

    socket.on('requestAllOtherImages', () => {
        for (let image of UnusedImagePaths) {
            let number = image.newPath.match(/(\d+)\..+/);
            let path = number ? GamePaths[number[1] - 1].startsWith('"') ? GamePaths[number[1] - 1].slice(1, GamePaths[number[1] - 1].length - 1) : GamePaths[number[1] - 1] : '';
            path = image.urlPath ? image.urlPath : path;

            socket.emit('getAllOtherImages', image, path);
        }
    })

    socket.on('changePath', (number, path) => {
        GamePaths[number - 1] = path;
        changeGamePathInc(number, path);
    });

    socket.on('moveToPad', (toNumber, imagePath, savedPath) => {
        if (savedPath) GamePaths[toNumber - 1] = savedPath;

        for (let path of ImagePaths) {
            for (let upath of UnusedImagePaths) { if (upath.newPath === imagePath) { UnusedImagePaths.splice(UnusedImagePaths.indexOf(upath), 1); } }
            if (path.path === imagePath) {
                if (path.newPath.match(/^\d+\..+/)) {
                    let fromNumber = path.newPath.match(/(\d+)\..+/)[1];
                    GamePaths[toNumber - 1] = GamePaths[fromNumber - 1];
                    GamePaths[fromNumber - 1] = '';
                    changeGamePathInc(fromNumber, '');
                }
                fs.renameSync(joinpath.join(__dirname, '../@Resources/Images/Icons/', path.newPath), joinpath.join(__dirname, '../@Resources/Images/Icons/', `${toNumber}.${path.newPath.match(/\.(.+)$/)[1]}`))
                ImagePaths[ImagePaths.indexOf(path)] = { path: path.path, newPath: `${toNumber}.${imagePath.match(/\.(.+)$/)[1]}` };
            }
        }

        changeGamePathInc(toNumber, GamePaths[toNumber - 1]);
    });

    socket.on('moveToList', (imagePath) => {
        for (let path of ImagePaths) {
            if (path.path === imagePath) {
                if (path.newPath.match(/\d+\..+/)) {
                    let fromNumber = path.newPath.match(/(\d+)\..+/)[1];
                    GamePaths[fromNumber - 1] = '';
                    changeGamePathInc(fromNumber, '');

                    let iTaken = true;
                    let iUntaken = 0;
                    for (let i = 0; iTaken; i++) {
                        iTaken = false;
                        iUntaken = i;
                        for (let path of UnusedImagePaths) {
                            if (path.newPath.startsWith(`List-${i}.`)) iTaken = true
                        }
                    }

                    ImagePaths[ImagePaths.indexOf(path)] = { path: path.path, newPath: `List-${iUntaken}.${path.newPath.match(/\.(.+)$/)[1]}` };
                    UnusedImagePaths.push({ path: path.path, newPath: `List-${iUntaken}.${path.newPath.match(/\.(.+)$/)[1]}`, fromPad: true });
                    fs.renameSync(joinpath.join(__dirname, '../@Resources/Images/Icons/', path.newPath), joinpath.join(__dirname, '../@Resources/Images/Icons/', `List-${iUntaken}.${path.newPath.match(/\.(.+)$/)[1]}`))
                }
            }
        }
    });
});

server.listen(3000);

const changeGamePathInc = (number, path) => {
    let RX = `Game${number}=.*`;
    const RegeX = new RegExp(RX, 'g');
    replace.sync({
        files: joinpath.join(__dirname, '../@Resources/Game Paths.inc'),
        from: RegeX,
        to: `Game${number}=${path}`,
    })
};

const setup = () => {
    GamePaths = fs.readFileSync('../@Resources/Game Paths.inc').toString().split('\n').filter(line => line.match(RX_GAME_PATHS)).map(line => { return line.match(RX_GAME_PATHS)[2]; });
    ImagePaths = fs.readdirSync('../@Resources/Images/Icons/').map(path => { return { path: path, newPath: path } });
    UnusedImagePaths = [];
    for (let path of ImagePaths) { UnusedImagePaths.push(path); }
    backup();
    addArgv();
}

const backup = () => {
    if (!fs.existsSync(joinpath.join(__dirname, 'backups/'))) fs.mkdirSync(joinpath.join(__dirname, 'backups/'));

    const currentDate = new Date(); 

    let fileName = currentDate.getDate() + "-"
        + (currentDate.getMonth() + 1) + "-"
        + currentDate.getFullYear() + "-"
        + currentDate.getHours() + "-"
        + currentDate.getMinutes() + "-"
        + currentDate.getSeconds() + ".zip";

    zip.zip(joinpath.join(__dirname, '../@Resources/'), joinpath.join(__dirname, 'backups/', fileName));
}

const addArgv = () => {
    if (!argv) return;

    for (let arg of argv) {
        let argPath = fs.existsSync(joinpath.resolve(__dirname, arg)) ? joinpath.resolve(__dirname, arg) : joinpath.resolve(arg); 
        if (!fs.existsSync(argPath)) argv = argv.filter(path => path !== arg)
        else {
            const argImages = fs.readdirSync(argPath);
            
            for (let argImage of argImages) {
                if (argImage.match(/\.(jpg|gif|png|JPG|GIF|PNG|JPEG|jpeg)$/)) {
                    UnusedImagePaths.push({ path: joinpath.join(arg, argImage), newPath: joinpath.join(arg, argImage) });
                    ImagePaths.push({ path: joinpath.join(arg, argImage), newPath: joinpath.join(arg, argImage) });
                } 
                
                //
                // Currently, only images work with argument-added folders. The first commented line doesn't quite work, yet, but checks if the file is a .lnk file.
                // The second line checks if the file is .url and retrieves the URL from it. It needs to retrieve the icon somehow (See the issue on Github.)
                //
                // argImage.match(/\.lnk$/) && console.log(fs.readFileSync(joinpath.join(arg, argImage)).toString());
                // argImage.match(/\.url$/) && UnusedImagePaths.push({ path: fs.readFileSync(joinpath.join(arg, argImage)).toString().match(/^URL=.*$/gm)[0].slice(4), urlPath: fs.readFileSync(joinpath.join(arg, argImage)).toString().match(/^URL=.*$/gm)[0].slice(4) });
            }
        }
    }
    
}