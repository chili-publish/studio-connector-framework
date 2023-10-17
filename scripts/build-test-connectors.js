const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const baseDir = path.join(process.cwd(), './src/connectors');

fs.readdir(baseDir, {withFileTypes: true}, (err, files) => {
  if (err) {
    console.error(`Error reading directory: ${err}`);
    return;
  }

  files.forEach(file => {
    if (file.isDirectory()) {
      const dirPath = path.join(baseDir, file.name);

      const installCommand = spawnSync('yarn', [], {
        cwd: dirPath,
        stdio: 'inherit',
      });
      trackProcess(installCommand, dirPath, 'install');

      const buildCommand = spawnSync('yarn', ['build'], {
        cwd: dirPath,
        stdio: 'inherit',
      });
      trackProcess(buildCommand, dirPath, 'build');

      const testCommand = spawnSync('yarn', ['test'], {
        cwd: dirPath,
        stdio: 'inherit',
      });
      trackProcess(testCommand, dirPath, 'test');
    }
  });
});

function trackProcess(command, dirPath, type) {
  if (command.error) {
    console.error(
      `Failed to start ${type} command in ${dirPath}:\n${command.error}`,
    );
  }

  console.log(
    `${type} command finished with exit code ${command.status} in ${dirPath}`,
  );
}
