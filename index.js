const express = require('express')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const joinpath = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');

const RX_GAME_PATHS = /Game(\d+)=(.*)/


app.use(express.static(joinpath.join(__dirname, '../@Resources/')));
app.use(express.static(joinpath.join(__dirname, '/CSS/')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Editor.html');
});

io.on('connection', socket => {
    let GamePaths = fs.readFileSync('../@Resources/Game Paths.inc').toString().split('\n').filter(line => line.match(RX_GAME_PATHS)).map(line => { return line.match(RX_GAME_PATHS)[2]; });
    const ImagePaths = fs.readdirSync('../@Resources/Images/Icons/').map(path => { return { path: path, newPath: path } });
    let UnusedImagePaths = [];
    for (let path of ImagePaths) { UnusedImagePaths.push(path); }
    
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

        socket.emit('getImage', imagePath, number, gamePath)
    });

    socket.on('requestPathOf', number => {
        socket.emit('getPathOf', GamePaths[number - 1]);
    })

    socket.on('requestAllOtherImages', () => {
        socket.emit('getAllOtherImages', UnusedImagePaths);
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