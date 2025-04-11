module.exports = function throwMessage (message) {
  const error = new Error(message);
  error.showOnlyMessage = true;
  throw error;
};
