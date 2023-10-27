import { PDFDocument, degrees } from "pdf-lib";
import remove from "lodash/remove";
import range from "lodash/range";
import min from "lodash/min";
import max from "lodash/max";
import maxBy from "lodash/maxBy";
import sumBy from "lodash/sumBy";
import { getDocument } from "pdfjs-dist/webpack";
import { dataURLtoFile } from "./helper/convertions";

export const pdfPageNo = async (file) => {
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  return pages;
};
//code to split to copy the given page into a new pdf file
const pdfSplit = async (file, pageNo) => {
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  //Creating a new empty document
  const subDocument = await PDFDocument.create();
  //getting the copiedpage
  const [copiedPage] = await subDocument.copyPages(pdfDoc, [pageNo - 1]);
  //Adding the page to the new pdf
  subDocument.addPage(copiedPage);
  const subPdfBytes = await subDocument.save();
  //converting the bytes to file
  const newSplitedFile = new File(
    [subPdfBytes],
    `${file.name.split(".")[0]}.pdf`,
    { type: "application/pdf" }
  );
  return newSplitedFile;
};
const createCanvas = (viewport) => {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  return { canvas, ctx };
};

//code to convert a pdf page to a canvas image data
const pdfPageToCanvas = (pdfObjectUrl, pageno, scale = 1.5) => {
  //returning the imagedata with its height and width
  return new Promise((resolve, reject) => {
    //converting file to objecturl
    const fileObjectUrl = URL.createObjectURL(pdfObjectUrl);
    //using pdfjs-dist to read the pdf
    const thisdoc = getDocument(fileObjectUrl);
    //after the document is loaded
    thisdoc.promise.then((pdf) => {
      //using pdfjs-dist to get the page for processing
      pdf.getPage(pageno).then((page) => {
        //using pdfjs-dist to get viewport
        let viewport = page.getViewport({ scale });
        //creating a canvas to render the pdf page
        let { canvas, ctx } = createCanvas({
          height: viewport.height,
          width: viewport.width,
        });
        let renderContext = { canvasContext: ctx, viewport: viewport };
        const mypage = page.render(renderContext);
        //after the page is rendered into the canvas
        mypage.promise.then(() => {
          //using canvas getimagedata to convert the image into image data for merging this image with other image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const height = canvas.height;
          const width = canvas.width;
          resolve({ imageData, height, width });
        });
      });
    });
  });
};
const pdfSplitMerge = async (file, config) => {
  return pdfPageNo(file).then(async (page) => {
    //Getting the no of pages in the pdf
    const totalPage = page.length;
    //config eg: '1-4,7-8,9' meaning merge the given pages and split the rest into new pdf files
    //below code convert the above string into this format [[1,4],[7,8],[9]]
    const condArray = config
      .split(",")
      .reduce((prev, current) => [...prev, current.split("-")], []);
    //below code filter out the arrays with single value
    const mergeArray = condArray.filter((item) => item?.length > 1);
    //below code create an array of no from 1 to total pages eg:1->3 then [1,2,3]
    let splitArray = range(1, totalPage + 1);
    //Looping to merge pdf pages
    const mergeFileArray = Promise.all(
      mergeArray.map(async (item) => {
        //item=[1,3]
        //Looping item to get image data for each page to merge and remove the page no from split array
        //min and max is used to take the highest and lowest no in the array and create a range array to loop that many times
        //eg:item will become [1,2,3]
        const locValue = await Promise.all(
          range(min(item), parseInt(max(item)) + 1).map(async (val) => {
            //removing the merged pages from split array
            remove(splitArray, (e) => e == val);
            const imageData = await pdfPageToCanvas(file, val);
            return imageData;
          })
        );
        // after getting all the pages image data inthe locvalue array
        //create a canvas with height as the sum of all the heights and width will be the largest width
        //this is done to ajoin images vertically to join horizondally do opposite
        let { canvas, ctx } = createCanvas({
          width: maxBy(locValue, "width").width,
          height: sumBy(locValue, "height"),
        });
        //previous height is to determine the position of the image in the new canvas
        let prevHeight = 0;
        locValue.map((page, index) => {
          //putimage has 3 main arguments 1)imagedata 2)position from left 3)position from top
          //All images are positioned left thats why its zero for horizondal alignment it will be previouswidth
          ctx.putImageData(page.imageData, 0, prevHeight);
          //increasing the height so the next image goes below the fist
          prevHeight += locValue[index].height;
        });
        //converting the canvas into a jpg file
        return dataURLtoFile(
          canvas.toDataURL(),
          `${file.name.split(".")[0]}.jpg`,
          "image/jpg"
        );
      })
    );
    //After the merge is completed we get array of image file as 'res'
    return mergeFileArray.then(async (res) => {
      //looping the split array after the merge is complete because the remove is done inside the merge
      const splitFileArray = await Promise.all(
        splitArray.map(async (pageNo) => {
          //below code returns a pdf file with only the page in the pagno position
          const splitedPdf = await pdfSplit(file, pageNo);
          return splitedPdf;
        })
      );
      //After the merge and split is completed both array is spread into new array
      return [...res, ...splitFileArray];
    });
  });
};
export const downloadFile = (file) => {
  // Create a link and set the URL using `createObjectURL`
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = URL.createObjectURL(file);
  link.download = file.name;

  // It needs to be added to the DOM so it can be clicked
  document.body.appendChild(link);
  link.click();

  // To make this work on Firefox we need to wait
  // a little while before removing it.
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.parentNode.removeChild(link);
  }, 0);
};
export const rotatePdf = async (file, angle = 0) => {
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const angleLoc = 90 + angle;
  pages.map((page) => page.setRotation(degrees(angleLoc)));
  const pdfBytesRotated = await pdfDoc.save();
  const newRotatedFile = new File([pdfBytesRotated], file.name, {
    type: "application/pdf",
  });
  return [newRotatedFile, angleLoc];
};
export default pdfSplitMerge;
