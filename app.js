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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
