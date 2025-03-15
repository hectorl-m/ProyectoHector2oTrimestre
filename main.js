const { app, BrowserWindow, ipcMain, contextBridge } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
});

ipcMain.handle('start-scraping', async (event, city) => {
    const formattedCity = encodeURIComponent(city);
    const url = `https://www.airbnb.es/s/${formattedCity}/homes?refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2025-03-01&monthly_length=3&monthly_end_date=2025-06-01&price_filter_input_type=0&channel=EXPLORE&date_picker_type=flexible_dates&checkin=2025-02-15&checkout=2025-02-16&flexible_trip_dates%5B%5D=may&adults=2&source=structured_search_input_header&search_type=filter_change`;

    const browser = await puppeteer.launch({ headless: true, slowMo: 100 });
    const page = await browser.newPage();

    await page.setViewport({ width: 1400, height: 800 });
    console.log(`Abriendo Airbnb en: ${city}...`);
    
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector(".c4mnd7m", { timeout: 60000 });
    console.log("Extrayendo datos...");
    
    await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
            window.scrollBy(0, window.innerHeight);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    });

    const data = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".c4mnd7m")).map(listing => {
            const title = listing.querySelector("div[data-testid='listing-card-title']")?.innerText.trim() || "No title";
            const price = listing.querySelector("span._hb913q")?.innerText.trim() || "No price";
            const rating = listing.querySelector(".r4a59j5")?.innerText.trim() || "No rating";
            const linkElement = listing.querySelector("a");
            const link = linkElement ? `https://www.airbnb.es${linkElement.getAttribute("href")}` : "No link";

            return { title, price, rating, link };
        });
    });

    console.log("Datos obtenidos:", data);

    await browser.close();
    
    return data;
});
