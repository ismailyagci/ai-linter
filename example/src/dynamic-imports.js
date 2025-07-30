import('./lazy-component.js');
import('./styles/theme.css');
import('./data/config.json');

const loadModule = async () => {
  const module = await import('./utils');
  return module;
};

export default loadModule;