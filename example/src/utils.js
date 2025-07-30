import './assets/icons.svg';

export const utils = {
  formatDate: (date) => date.toISOString(),
  capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1)
};