const { app, BrowserWindow, ipcMain } = require('electron');
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

ipcMain.handle('start-scraping', async (event, formData) => {
    // Extraemos datos del formulario
    const { city, checkin, checkout, adults, children, infants, pets } = formData;
    const formattedCity = encodeURIComponent(city);

    // Construimos la URL con los parámetros (puedes agregar más parámetros según tus necesidades)
    const url = `https://www.airbnb.es/s/${formattedCity}/homes?` +
        `checkin=${checkin}&checkout=${checkout}` +
        `&adults=${adults}&children=${children}&infants=${infants}&pets=${pets}` +
        `&source=structured_search_input_header&search_type=filter_change`;

    console.log(`Abriendo Airbnb en: ${city}...`);
    console.log(`URL: ${url}`);

    const browser = await puppeteer.launch({ headless: true, slowMo: 100 });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 800 });
    
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector(".c4mnd7m", { timeout: 60000 });
    console.log("Extrayendo datos...");
    
    // Hacemos scroll para cargar más resultados (opcional)
    await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
            window.scrollBy(0, window.innerHeight);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    });

    // Extraemos la información de cada anuncio
    const data = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".c4mnd7m")).map(listing => {
            const title = listing.querySelector("div[data-testid='listing-card-title']")?.innerText.trim() || "No title";
            const price = listing.querySelector("span._hb913q")?.innerText.trim() || "No price";
            const rating = listing.querySelector(".r4a59j5")?.innerText.trim() || "No rating";
            const linkElement = listing.querySelector("a");
            const link = linkElement ? `https://www.airbnb.es${linkElement.getAttribute("href")}` : "No link";
    
            // Usamos el selector que incluye todas las clases indicadas
            const imgElement = listing.querySelector("img.i1ezuexe.atm_e2_idpfg4.atm_vy_idpfg4.atm_mk_stnw88.atm_e2_1osqo2v__1lzdix4.atm_vy_1osqo2v__1lzdix4.i1wndum8.atm_jp_pyzg9w.atm_jr_nyqth1.i16t4q3z.atm_vh_yfq0k3.dir.dir-ltr");
            const image = imgElement ? imgElement.getAttribute("src") : "No image";
    
            return { title, price, rating, link, image };
        });
    });    

    console.log("Datos obtenidos:", data);
    await browser.close();
    
    return data;
});
