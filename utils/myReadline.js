const readline = require('node:readline');

const commands = { };

module.exports = {
  registerCmd,
  startReadline,
  question
};

// -- readLine

function registerCmd (title, usage, key, func) {
  if (commands[key] != null) throw Error(`Tried to register twice command: ${key}`);
  commands[key] = { title, usage, func, key };
}

registerCmd('Quit', '', ['q'], async function quit () {
  process.exit(0);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question (text) {
  return new Promise((resolve, reject) => {
    rl.question('\n' + text, function (cmd) {
      resolve(cmd.split(' '));
    });
  });
}

function startReadline () {
  rl.question('\nCommand: ', async function (cmd) {
    const cmds = cmd.split(' ');
    const key = cmds[0];
    const args = cmds.slice(1);
    const command = commands[key];
    if (command == null) {
      console.log('*** No existing command: "' + key + '"');
      showUsage();
    } else {
      try {
        console.log('Execute: ' + command.title);
        const res = await command.func(...args);
        if (res != null) console.log(res);
      } catch (e) {
        if (e.showOnlyMessage) {
          console.log('Error:' + e.message);
          console.log(getCommandLine(command));
        } else {
          console.log(e);
        }
      }
    }
    startReadline(); // Calling this function again to ask new question
  });
}

function showUsage () {
  for (const com of Object.values(commands)) {
    console.log('- ' + getCommandLine(com));
  }
}

function getCommandLine (command) {
  return command.title + '\t: ' + command.key + ' ' + command.usage;
}
