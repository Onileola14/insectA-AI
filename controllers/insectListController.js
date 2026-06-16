const { listInsects } = require("../services/insectService");

const getAll = async (req, res) => {
  const insects = await listInsects({ crop: req.query.crop });
  res.json({ count: insects.length, insects });
};

module.exports = getAll;
