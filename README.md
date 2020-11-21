# Gamepad-Editor
A Socket.io/Node.js Web App to ease the changing of the placement of images and their respective game paths. 

## How to use this Web App?

The setup is simple but needs to be done correctly to function:

1. If you have not done it already, install [Npm and Node.js](https://www.npmjs.com/get-npm).
2. Download and unzip [the latest (Pre-)Release](https://github.com/Javernus/Gamepad-Editor/releases). 
3. Navigate to your Rainmeter folder (in Documents/ usually) and then into your Gamepad skin folder and drop the Gamepad Editor inside of there.
4. Open a Command Prompt and navigate the the Gamepad Editor folder.
5. Run `npm install` to install all the necessary dependencies for the Web App.
6. Run `node index.js` and head to [localhost:3000](localhost:3000) to open the Web App!
7. Enjoy! Everything else is automated. Wondering how to add images? Read on.

## How to add images?

To add images, navigate out of the `Gamepad Editor` and head to `@Resources/Images/Icons` and drop the desired images here. 
The system will automagically detect the images and add them to the List.

## Warning about the paths!

The paths of the items in the List do **not** get saved somewhere, so if you move a game from the Launcher to the List and reload, the path is **gone**. This does not apply for games which are placed in the List initially, they either have no path at all or their path is saved as an invisible Game Path. (Game 49 has an image and a path in the Game Paths.inc file, but since the 8x4 size is selected, it is placed inside the list. This does **not** delete the path!) 