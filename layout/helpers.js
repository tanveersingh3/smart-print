// layout/helpers.js

const path = require("path");

function isImage(file) {

    const ext = path.extname(file).toLowerCase();

    return [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp"
    ].includes(ext);

}

function isPDF(file) {

    return path.extname(file).toLowerCase()===".pdf";

}

module.exports = {

    isImage,

    isPDF

};