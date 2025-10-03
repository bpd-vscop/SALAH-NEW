const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');

module.exports = {
  slugify,
};
