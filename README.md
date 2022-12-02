# Sighthound Video - Remote Web Viewer

## Initial Setup

* Clone this project to your local machine
* Install [Node v10.x](https://nodejs.org/en/download/) - ([NVM](https://github.com/nvm-sh/nvm) recommended)
* Using the command line, run `npm install` from within the project folder.

## Development

When developing locally, there is a "watch" mode that will detect file changes/additions and automatically rebuild any files that need it. This will create a 'dist' folder in the project root that contains the bundled source file and other dependencies.

    npm run watch

Alternatively, you can run `npm run build` to generate a development build inside of the `dist` folder that doesn't watch for file changes.

### Link Web Viewer to Sighthound Video

Since this web application will need to communicate with Sighthound Video during development, the source code MUST be served by Sighthound Video's built-in web server. Without getting into the technical reasons why you can't just point the JavaScript calls to Sighthound's IP address and port (spoiler: CORS), the easiest fix is to create a symbolic link for Sighthound Video's `svremoteviewer` folder that points to the contents of the `dist` folder in this project (or manually copy the contents of the `dist` folder over).

1. Make sure the `dist` folder exists in this project by running any of the build commands (Development or Release) from above.

        npm run watch

2. Delete and recreate the `svremoteviewer` folder in your locally installed Sighthound Video.

        rm -rf /Applications/Sighthound\ Video.app/Contents/Resources/svremoteviewer && mkdir /Applications/Sighthound\ Video.app/Contents/Resources/svremoteviewer

3. Create the symbolic link:

        ln -s /[Project-Parent-Path]/dist/* /Applications/Sighthound\ Video.app/Contents/Resources/svremoteviewer

### Running Web Viewer

Once this project's `dist` folder is properly linked to Sighthound Video, you can use it by following these steps:

1. Start Sighthound Video and make sure Remote Access is enabled, noting the port number.
2. Open a web browser and go to `https://localhost:[remotePort]`
3. The remote web viewer should display in the browser.

If you are running `npm run watch` in a terminal, any changes you make to this project source code will be automatically updated in the `dist` folder. To view them, just refresh your browser.

## Building / Packaging

Webpack is used to bundle all of the source code and 3rd-party dependencies into a single JS file and move any other required external files into a folder named `dist` in this project's root. The contents of this folder are what's ultimately placed inside of Sighthound Video's source in the `svremoteviewer` folder.

### Release / Production

Release builds go through a few extra steps than development builds: minifying JS code, enabling React production mode, and using Babel to transpile the JS down to ES5 for older browser support. To generate a Release build:

    npm run build:release
