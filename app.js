const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors');
const authenticateToken = require('./middleware/middleware');
const plantsRouter = require('./routes/plants');

app.use(cors()); 
// app.options('*', cors());

app.use(express.json({ limit: '15mb' }));
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

app.use('/plants', plantsRouter);

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

const path = require('path');

// Serve static files from the React frontend app
// app.use(express.static(path.join(__dirname, '../Frontend/dist')));

// Anything that doesn't match the above, send back index.html
// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, '../Frontend/dist/index.html'));
// });
// Health check endpoint for uptime bot and Render
app.get(['/health', '/healthz'], (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
