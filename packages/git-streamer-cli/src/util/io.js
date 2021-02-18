export const aliasArgv = (argv, aliases) => {
  argv = new Set(argv);
  aliases = Object.entries(aliases);

  for (let [target, sources] of aliases) {
    sources = [].concat(sources);

    for (let source of sources) {
      if (argv.has(source)) {
        argv.add(target);
        argv.delete(source);
        break;
      }
    }
  }

  return [...argv];
};
