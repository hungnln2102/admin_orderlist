class ChangeSupplierError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ChangeSupplierError";
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = {
  ChangeSupplierError,
};
