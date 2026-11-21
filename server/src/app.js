const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { clientUrl, nodeEnv } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientUrl.split(',').map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (nodeEnv === 'development') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/issues', require('./routes/issue.routes'));
app.use('/api', require('./routes/misc.routes'));

// Uploaded attachments (served with nosniff from helmet)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
