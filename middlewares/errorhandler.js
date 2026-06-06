const { StatusCodes } = require("http-status-codes");

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: err.message || "Something went wrong",
  });
};

module.exports = errorHandler;
