const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;





const targetYears = ["Mar 2024", "Mar 2023", "Mar 2022", "Mar 2013"];

async function getRatioId(code) {
  const url = "https://www.screener.in/company/" + code;

  // Define valid headers for the request
  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'cookie': 'csrftoken=Hpl4URRGvUZTyWMJXfxNFA6hMgQnVt29; sessionid=d9ntx5feo4385ajxec30hyuti4brpuy6',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  };

  try {
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    // Extract data-warehouse-id from the div
    const warehouseId = $('div[data-warehouse-id]').attr('data-warehouse-id');
    return warehouseId;  // Return the id
  } catch (error) {
    console.error('Error fetching ratio ID:', error);
    throw error;  // Propagate error if needed
  }
}

app.get("/api/quickratio", async (req, res) => {
  const code = req.query.code;
  let ratioData;
  let ratios = [];
  
  try {
    // Wait for the getRatioId to return the correct ID
    const id = await getRatioId(code);

    if (!id) {
      return res.status(404).send('Warehouse ID not found');
    }

    // Define valid headers for the request
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'cookie': 'csrftoken=Hpl4URRGvUZTyWMJXfxNFA6hMgQnVt29; sessionid=d9ntx5feo4385ajxec30hyuti4brpuy6',
      'priority': 'u=0, i',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };

    // Use the obtained id to form the ratio URL
    const ratioUrl = `https://www.screener.in/api/company/${id}/quick_ratios/`;

    // Make the request to get the ratios data
    const ratioResponse = await axios.get(ratioUrl, { headers });
    ratioData = ratioResponse.data;

    // Parse the ratio data and extract values
    const $ = cheerio.load(ratioData);
    $('span.number').each((index, element) => {
      ratios.push($(element).text().trim());
    });

    // Send the ratios as the response
    res.send(ratios);
  } catch (error) {
    console.error('Error in /api/quickratio route:', error);
    res.status(500).send('Error occurred while processing the request.');
  }
});

app.get("/api/profit-loss", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const {
      data: html
    } = await axios.get(url);
    const $ = cheerio.load(html);



    // Select the "profit-loss" section and extract the table
    const table = $('section#profit-loss table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found"
      });
    }

    // Extract table headers
    const headers = [];
    table.find("thead th").each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Create an object to store data for each target year
    const result = {};

    targetYears.forEach((year) => {
      const columnIndex = headers.indexOf(year);
      if (columnIndex !== -1) {
        const yearData = [];
        table.find("tbody tr").each((_, row) => {
          const cells = $(row).find("td");
          yearData.push($(cells[columnIndex]).text().trim());
        });
        result[year] = yearData;
      } else {
        result[year] = "Data not found"; // Handles missing year columns
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching data.",
      details: error.message
    });
  }
});

app.get("/api/quarters", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const {
      data: html
    } = await axios.get(url);
    const $ = cheerio.load(html);

    // Select the "quarters" section and extract the table
    const table = $('section#quarters table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found in the quarters section."
      });
    }

    // Extract table headers
    const headers = [];
    table.find("thead th").each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Determine column indices
    const totalColumns = headers.length;
    const fifthLastIndex = totalColumns - 5; // 5th last column index
    const lastIndex = totalColumns - 1; // Last column index

    if (fifthLastIndex < 0 || lastIndex < 0) {
      return res.status(404).json({
        message: "Not enough columns in the table."
      });
    }

    // Extract data from the 5th-last and last columns
    const quartersData = {
      "recentQuarter": [],
      "prevQuarter": []
    };

    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");

      // Extract "recentQuarter" (last column) and "prevQuarter" (5th last column) values
      quartersData["recentQuarter"].push($(cells[lastIndex]).text().trim());
      quartersData["prevQuarter"].push($(cells[fifthLastIndex]).text().trim());
    });

    res.json(quartersData);
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching the table data.",
      details: error.message
    });
  }
});

app.get("/api/balance-sheet", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const {
      data: html
    } = await axios.get(url);
    const $ = cheerio.load(html);

    // Select the "balance-sheet" section and extract the table
    const table = $('section#balance-sheet table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found in the balance-sheet section."
      });
    }

    // Extract table headers
    const headers = [];
    table.find("thead th").each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Determine the index of the last column
    const totalColumns = headers.length;
    const lastIndex = totalColumns - 1; // Last column index

    if (lastIndex < 0) {
      return res.status(404).json({
        message: "Not enough columns in the table."
      });
    }

    // Extract data from the last column
    const balanceSheetData = {
      "lastColumn": []
    };

    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");

      // Extract the value from the last column
      balanceSheetData["lastColumn"].push($(cells[lastIndex]).text().trim());
    });

    res.json(balanceSheetData);
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching the table data.",
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
