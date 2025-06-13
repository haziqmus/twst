const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// GitHub Configuration (Hardcoded - FOR DEMO ONLY.  NEVER DO THIS IN PRODUCTION!)
const githubRepoOwner = 'Zie619';
const githubRepoName = 'n8n-workflows';
const githubJsonFilePath = 'nodes'; //The json file path, to find files on this folder

// Middleware to parse JSON request bodies
app.use(express.json());

// Function to fetch a file from GitHub
async function fetchFileContent(filePath) {
    try {
        const response = await axios.get(`https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/contents/${githubJsonFilePath}/${filePath}`, {
            headers: {
                'Accept': 'application/vnd.github.v3.raw' // Get raw content
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${filePath}:`, error.message);
        return null;
    }
}

// Function to list files in a GitHub directory
async function listFiles(directoryPath) {
    try {
        const response = await axios.get(`https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/contents/${directoryPath}`);

        if (response.status === 200) {
            return response.data.filter(item => item.type === 'file' && item.name.endsWith('.json')).map(item => item.name);
        } else {
            console.error('Error listing files:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error listing files:', error.message);
        return [];
    }
}


// Search endpoint
app.post('/search', async (req, res) => {
    const { keyword } = req.body;

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {
        const fileList = await listFiles(githubJsonFilePath);
        if (!fileList || fileList.length === 0) {
            return res.status(500).json({ error: 'Could not retrieve file list from GitHub.' });
        }

        for (const fileName of fileList) {
            const fileContent = await fetchFileContent(fileName);

            if (fileContent && typeof fileContent === 'string') {
                if (fileContent.includes(keyword)) {
                    return res.json({
                        message: `Keyword found in ${fileName}`,
                        fileContent: fileContent
                    });
                }
            } else {
                console.warn(`Skipping file ${fileName} because content is not a string.`);
            }
        }

        return res.status(404).json({ message: 'Keyword not found in any files.' });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'An error occurred during the search.' });
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
