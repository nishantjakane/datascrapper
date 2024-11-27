const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Array of target years
const targetYears = ["Mar 2024", "Mar 2023", "Mar 2022", "Mar 2013"];

app.get("/api/profit-loss", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({ message: "Code parameter is required." });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Select the "profit-loss" section and extract the table
    const table = $('section#profit-loss table');
    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found" });
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
    res.status(500).json({ error: "An error occurred while fetching data.", details: error.message });
  }
});

app.get("/api/quarters", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({ message: "Code parameter is required." });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Select the "quarters" section and extract the table
    const table = $('section#quarters table');
    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found in the quarters section." });
    }

    // Extract table headers
    const headers = [];
    table.find("thead th").each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Determine column indices
    const totalColumns = headers.length;
    const fifthLastIndex = totalColumns - 5;  // 5th last column index
    const lastIndex = totalColumns - 1;       // Last column index

    if (fifthLastIndex < 0 || lastIndex < 0) {
      return res.status(404).json({ message: "Not enough columns in the table." });
    }

    // Extract data from the 5th-last and last columns
    const quartersData = { "recentQuarter": [], "prevQuarter": [] };

    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");

      // Extract "recentQuarter" (last column) and "prevQuarter" (5th last column) values
      quartersData["recentQuarter"].push($(cells[lastIndex]).text().trim());
      quartersData["prevQuarter"].push($(cells[fifthLastIndex]).text().trim());
    });

    res.json(quartersData);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching the table data.", details: error.message });
  }
});

app.get("/api/balance-sheet", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({ message: "Code parameter is required." });
  }

  try {
    const url = `https://www.screener.in/company/${code}/`; // Construct URL dynamically using the 'code'

    // Fetch the HTML content
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Select the "balance-sheet" section and extract the table
    const table = $('section#balance-sheet table');
    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found in the balance-sheet section." });
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
      return res.status(404).json({ message: "Not enough columns in the table." });
    }

    // Extract data from the last column
    const balanceSheetData = { "lastColumn": [] };

    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");

      // Extract the value from the last column
      balanceSheetData["lastColumn"].push($(cells[lastIndex]).text().trim());
    });

    res.json(balanceSheetData);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching the table data.", details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
