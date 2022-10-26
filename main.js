const pptr = require("puppeteer");
const pdf = require("pdfkit");
const fs = require("fs");

// let animePlaylist = "https://www.youtube.com/playlist?list=PLvpJuQwm0QUxu2S1_qa273S7xGVPHF0O4";
let ncsPlaylist = "https://www.youtube.com/playlist?list=PLW-S5oymMexXTgRyT3BWVt_y608nt85Uj";
let cTab;

(async function () {
    try {
        let browserOpen = pptr.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"]
        });
        let browserInstance = await browserOpen
        let allTabs = await browserInstance.pages();
        cTab = allTabs[0];
        await cTab.goto(ncsPlaylist);
        await cTab.waitForSelector("h1#title");
        let titleName = await cTab.evaluate(function (selector) { return document.querySelector(selector).innerText }, "h1#title"); // can use evaluate() to pass function as 1st parameter and 2nd parameter to paas the argument for the 1st parameter's parameter i.e. function.
        let viewsNDvideos = await cTab.evaluate(getData, '#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer');
        let totalVideos = viewsNDvideos.noOfVideos.split(" ")[0];
        // console.log(titleName, totalVideos, viewsNDvideos.noOfViews);
        let currentVideos = await getCurrentVideosLen();
        // console.log(currentVideos);
        while (totalVideos - currentVideos >= 20) { // never "make totalVideos - currentVideos >= 0" because then program will never exit the while loop
            await scrollToBottom()
            currentVideos = await getCurrentVideosLen()
        }
        let finalList = await getStats();
        // console.log(finalList);
        let pdfDoc = new pdf;
        pdfDoc.pipe(fs.createWriteStream(titleName + '.pdf'))
        pdfDoc.text(JSON.stringify(finalList));
        pdfDoc.end();

    } catch (error) {
        console.log(error);
    }
})()


function getData(selector) {
    let allElems = document.querySelectorAll(selector);
    let noOfVideos = allElems[0].innerText;
    let noOfViews = allElems[1].innerText;
    return { noOfVideos, noOfViews };
}

async function getCurrentVideosLen() {
    let length = await cTab.evaluate(getLen, '#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer'); // using  .evaluate to automatically pass all browser info to the function such as "document in document.querySelectorAll"
    return length;
}

function getLen(durationSelect) {
    let durationElem = document.querySelectorAll(durationSelect);
    return durationElem.length;
}

async function scrollToBottom() {
    await cTab.evaluate(goToBottom); //will execute the function.
    function goToBottom() {
        window.scrollBy(0, window.innerHeight);  //scrols from 0 to end i.e. height of the screen.
    }
}

async function getStats() {
    // console.log("in getStats");
    let list = await cTab.evaluate(getNameAndDuration, "#video-title", "#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer");
    // console.log(list);
    // let list = getNameAndDuration(".yt-simple-endpoint.style-scope.ytd-playlist-video-renderer", "#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer");      // doesnt work since browser elements like "document" don't get transfered to the function.
    return list;
}

// /\/\/\/\/\/\/\/\/\/\/\/\------------------------------------- VERY IMPORTANT NOTE -------------------------------------------/\/\/\/\/\/\/\/\/\/\/\/\
//  the function being used in EVALUATE (in this case getNameAndDuration) MUST BE:
// * LOWER than the async function.   
// *   ------OR-------
// * INSIDE the async function.

function getNameAndDuration(videoSelector, durationSelector) {
    let videoElem = document.querySelectorAll(videoSelector);
    let durationElem = document.querySelectorAll(durationSelector);
    let currentList = [];
    console.log(typeof(durationElem));
    for (let i = 0; i < durationElem.length; i++) {
        let videoTitle = videoElem[i].innerText;
        let duration = durationElem[i].innerText;
        currentList.push({ videoTitle, duration });
        // console.log("***************");
        // console.log(videoTitle, duration);
    }
    // console.log(currentList);
    // console.log("**********************");
    return currentList;
}