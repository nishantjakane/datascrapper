const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const {
  url
} = require("inspector");

const app = express();
const PORT = process.env.PORT || 3000;


const headers = {
  "accept": "*/*",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en-US,en;q=0.9",
  "cookie": "csrftoken=ipEsCmjFkGsZiuydGeIu2BBoJlV543SD; sessionid=wyljcrir33x0lht7skf0u66lnzgkfft5",
  "priority": "u=1, i",
  "referer": url,
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest"
};


const targetYears = ["Mar 2024", "Mar 2023", "Mar 2022", "Mar 2013"];

async function getRatioId(code, type) {
  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";
  } else {
    url = "https://www.screener.in/company/" + code;
  }

  

  try {
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    const warehouseId = $('div[data-warehouse-id]').attr('data-warehouse-id');
    console.log("Warehouse ID:", warehouseId);
    return warehouseId;
  } catch (error) {
    console.error('Error fetching ratio ID:', error);
    throw error;
  }
}


app.get("/api/ratios", async (req, res) => {
  try {
    const {
      code
    } = req.query;
    const {
      type
    } = req.query;
    if (!code) {
      return res.status(400).json({
        error: "Code parameter is required"
      });
    }
    let url;
    if (type === "consolidated") {
      url = "https://www.screener.in/company/" + code + "/consolidated/";
  
    } else {
      url = "https://www.screener.in/company/" + code;
  
    }

    // Fetch the Screener page
    const response = await axios.get(url,{ headers });
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract table rows inside #ratios
    const tableRows = $("#ratios table tr");
    const ratiosData = [];

    tableRows.each((index, row) => {
      const cells = $(row).find("td, th");
      const rowData = [];
      cells.each((_, cell) => {
        rowData.push($(cell).text().trim());
      });
      if (rowData.length) {
        ratiosData.push(rowData);
      }
    });

    // Convert to JSON structure
    const tableHeaders  = ratiosData[0];
    const jsonData = ratiosData.slice(1).map(row =>
      row.reduce((acc, value, index) => {
        acc[tableHeaders [index]] = value;
        return acc;
      }, {})
    );

    // Return the extracted JSON data
    res.json({
      message: "Data extracted successfully",
      data: jsonData
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
});


app.get("/api/quickratio", async (req, res) => {
  const code = req.query.code;
  const type = req.query.type;
  let ratioData;
  let ratios = [];
  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";

  } else {
    url = "https://www.screener.in/company/" + code;

  }

  try {
    // Wait for the getRatioId to return the correct ID
    const id = await getRatioId(code, type);

    if (!id) {
      return res.status(404).send('Warehouse ID not found');
    }

    // Define valid headers for the request
    

    // Use the obtained id to form the ratio URL
    const ratioUrl = `https://www.screener.in/api/company/${id}/quick_ratios/`;

    // Make the request to get the ratios data
    const ratioResponse = await axios.get(ratioUrl, {
      headers
    });
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
  const code = req.query.code;
  const type = req.query.type; // Get the 'code' query parameter

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }
  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";

  } else {
    url = "https://www.screener.in/company/" + code;

  }
  try {

    // Fetch the HTML content
    const {
      data: html
    } = await axios.get(url,{ headers });
    const $ = cheerio.load(html);



    // Select the "profit-loss" section and extract the table
    const table = $('section#profit-loss table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found"
      });
    }

    // Extract table headers
    const tableHeaders  = [];
    table.find("thead th").each((_, th) => {
      tableHeaders .push($(th).text().trim());
    });

    // Create an object to store data for each target year
    const result = {};

    targetYears.forEach((year) => {
      const columnIndex = tableHeaders .indexOf(year);
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

function transformJson(input) {
  const {table } = input;
  const transformedTable = {};

  table.forEach(row => {
    // Remove the "+" from Column_1 and trim any extra spaces
    const key = row['Column_1'].replace('+', '').trim();
    
    // Remove the 'Column_1' key and keep only the data for the sub-items
    const { Column_1, ...data } = row;
    
    // Add the data as a parent key with its data nested inside
    transformedTable[key] = { ...data };
  });

  return {
    ...transformedTable
  };
}

app.get("/api/quarters", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter
  const type = req.query.type;

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }

  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";
  } else {
    url = "https://www.screener.in/company/" + code;
  }

  try {
    // Fetch the HTML content
    const { data: html } = await axios.get(url,{ headers });
    const $ = cheerio.load(html);

    // Select the "quarters" section and extract the table
    const table = $('section#quarters table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found in the quarters section."
      });
    }

    // Extract table headers
    const tableHeaders  = [];
    table.find("thead th").each((_, th) => {
      tableHeaders .push($(th).text().trim());
    });

    // Extract entire table data row by row
    const tableData = [];
    table.find("tbody tr").each((_, row) => {
      const rowData = {};
      $(row).find("td").each((index, cell) => {
        rowData[tableHeaders [index] || `Column_${index + 1}`] = $(cell).text().trim();
      });
      tableData.push(rowData);
    });

    // Determine column indices
    const totalColumns = tableHeaders .length;
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
      "prevQuarter": [],
      "table": tableData 
    };

    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");

      // Extract "recentQuarter" (last column) and "prevQuarter" (5th last column) values
      quartersData["recentQuarter"].push($(cells[lastIndex]).text().trim());
      quartersData["prevQuarter"].push($(cells[fifthLastIndex]).text().trim());
    });

    // Return the quarters data
    res.json(quartersData);

  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching the table data.",
      details: error.message
    });
  }
});
function transformData(input) {
  const years = Object.keys(input.data[0]).slice(1); // Get the years from the first category (excluding the empty key)

  const transformedData = {};

  input.data.forEach(category => {
    // Modify category name: If it's "Net Profit +", change it to "Net Profit"
    const categoryName = category[""] === "Net Profit +" ? "Net Profit" : category[""];

    years.forEach(year => {
      // Initialize the year entry in the transformedData if not already done
      if (!transformedData[year]) {
        transformedData[year] = [];
      }

      // Push corresponding values to each year entry
      transformedData[year].push(category[year]);
    });
  });

  return transformedData; // Wrap the transformed data inside the "data" key
}


async function extractTableData(code,type) {
  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";

  } else {
    url = "https://www.screener.in/company/" + code;
  }

  try {
    // Fetch the page content using axios
    const { data: html } = await axios.get(url,{ headers });
    const $ = cheerio.load(html);

    // Select the table you want to extract (modify selector as needed)
    const table = $("section#quarters table");
    if (!table.length) {
      return { error: "Table not found on the page." };
    }

    // Extract headers
    const tableHeaders  = [];
    table.find("thead th").each((_, th) => {
      tableHeaders .push($(th).text().trim());
    });

    // Extract rows
    const rowsData = [];
    table.find("tbody tr").each((_, tr) => {
      const row = {};
      $(tr).find("td").each((index, td) => {
        row[tableHeaders [index]] = $(td).text().trim();
      });
      rowsData.push(row);
    });

    return { data: rowsData };
  } catch (error) {
    console.error("Error extracting table data:", error.message);
    return { error: "An error occurred while fetching data." };
  }
}


app.get("/api/trading/quarters", async (req, res) => {
  const code = req.query.code;
  const type  = req.query.type;

  if (!code) {
    return res.status(400).json({ error: "Company code is required." });
  }

  try {
    const tableData = await extractTableData(code,type);
    const transformedData = transformData(tableData);

    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ error: "Failed to extract table data." });
  }
});

app.get("/api/balance-sheet", async (req, res) => {
  const code = req.query.code; // Get the 'code' query parameter
  const type = req.query.type;
  let url;
  if (type === "consolidated") {
    url = "https://www.screener.in/company/" + code + "/consolidated/";

  } else {
    url = "https://www.screener.in/company/" + code;

  }

  if (!code) {
    return res.status(400).json({
      message: "Code parameter is required."
    });
  }

  try {

    // Fetch the HTML content
    const {
      data: html
    } = await axios.get(url,{ headers });
    const $ = cheerio.load(html);

    // Select the "balance-sheet" section and extract the table
    const table = $('section#balance-sheet table');
    if (table.length === 0) {
      return res.status(404).json({
        message: "Table not found in the balance-sheet section."
      });
    }

    // Extract table headers
    const tableHeaders  = [];
    table.find("thead th").each((_, th) => {
      tableHeaders .push($(th).text().trim());
    });

    // Determine the index of the last column
    const totalColumns = tableHeaders .length;
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
