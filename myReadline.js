const readline = require('node:readline');

const commands = { };
const commandsDesc = [];

module.exports = {
  registerCmd,
  startReadline
};

// -- readLine

function registerCmd (title, keys, func) {
  commandsDesc.push({ title, keys });
  for (const key of keys) {
    if (commands[key] != null) throw Error(`Tried to register twice command: ${key}`);
    commands[key] = func;
  }
}

registerCmd('Quit', ['q'], async function quit () {
  process.exit(0);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function startReadline () {
  rl.question('\nCommand: ', async function (cmd) {
    const cmds = cmd.split(' ');
    const key = cmds[0];
    const args = cmds.slice(1);
    if (commands[key] == null) {
      console.log('*** No existing command: "' + key + '"');
      showUsage();
    } else {
      try {
        const res = await commands[key](...args);
        console.log(res);
      } catch (e) {
        console.log(e);
      }
    }
    startReadline(); // Calling this function again to ask new question
  });
}

function showUsage () {
  for (const com of commandsDesc) {
    console.log(`- ${com.keys.join(', ')} \t ${com.title}`);
  }
}
