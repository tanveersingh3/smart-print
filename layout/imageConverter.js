// layout/imageConverter.js

const sharp = require("sharp");

const fs = require("fs");

const path = require("path");

const { PDFDocument } = require("pdf-lib");

const { A4,MARGIN } = require("./constants");

async function imageToPDF(imagePath){

    const pdf = await PDFDocument.create();

    const page = pdf.addPage([A4.width,A4.height]);

    const imageBuffer = fs.readFileSync(imagePath);

    const metadata = await sharp(imageBuffer).metadata();

    let image;

    if(metadata.format==="png"){

        image = await pdf.embedPng(imageBuffer);

    }

    else{

        image = await pdf.embedJpg(imageBuffer);

    }

    const imgWidth=image.width;

    const imgHeight=image.height;

    const maxWidth=A4.width-MARGIN*2;

    const maxHeight=A4.height-MARGIN*2;

    const scale=Math.min(

        maxWidth/imgWidth,

        maxHeight/imgHeight

    );

    const drawWidth=imgWidth*scale;

    const drawHeight=imgHeight*scale;

    const x=(A4.width-drawWidth)/2;

    const y=(A4.height-drawHeight)/2;

    page.drawImage(image,{

        x,

        y,

        width:drawWidth,

        height:drawHeight

    });

    const pdfBytes=await pdf.save();

    const output=imagePath.replace(path.extname(imagePath),".pdf");

    fs.writeFileSync(output,pdfBytes);

    return output;

}

module.exports=imageToPDF;