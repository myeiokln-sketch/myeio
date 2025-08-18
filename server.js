const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only PDF, DOC, or DOCX files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 4 * 1024 * 1024 } // 4MB limit
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",                   // Local development
    "https://frontend-seven-omega-20.vercel.app" // Your deployed frontend
  ],
}));

app.use(bodyParser.json());
app.use(express.static('uploads'));

// Configure Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});

// ✅ Root Route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.send("🚀 API is running! Use POST /api/send-email or /api/send-career-application");
});

// Contact Form Endpoint
app.post('/api/send-email', async (req, res) => {
  const { name, email, subject, message, to_email } = req.body;

  if (!name || !email || !subject || !message || !to_email) {
    console.error('Validation failed:', { name, email, subject, message, to_email });
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    console.error('Invalid email:', email);
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const mailOptions = {
    from: `"${name}" <${process.env.GMAIL_USER}>`,
    to: to_email,
    subject,
    text: `Message from ${name} (${email}):\n\n${message}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message}</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent to:', to_email);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Career Application Endpoint
app.post('/api/send-career-application', upload.single('resume'), async (req, res) => {
  const { jobType, position, fullName, phone, email, qualification, degree, experience, about, to_email } = req.body;
  const resume = req.file;

  if (!jobType || !position || !fullName || !phone || !email || !qualification || !degree || !experience || !about || !to_email || !resume) {
    console.error('Validation failed:', { jobType, position, fullName, phone, email, qualification, degree, experience, about, to_email, resume });
    return res.status(400).json({ error: 'All fields and resume are required' });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    console.error('Invalid email:', email);
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!/^\+?\d{10,15}$/.test(phone.trim())) {
    console.error('Invalid phone:', phone);
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const mailOptions = {
    from: `"${fullName}" <${process.env.GMAIL_USER}>`,
    to: to_email,
    subject: `Career Application: ${position} (${jobType})`,
    text: `New career application:\n\nJob Type: ${jobType}\nPosition: ${position}\nName: ${fullName}\nPhone: ${phone}\nEmail: ${email}\nQualification: ${qualification}\nDegree: ${degree}\nExperience: ${experience}\nAbout: ${about}`,
    html: `
      <h3>New Career Application</h3>
      <p><strong>Job Type:</strong> ${jobType}</p>
      <p><strong>Position:</strong> ${position}</p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Qualification:</strong> ${qualification}</p>
      <p><strong>Degree:</strong> ${degree}</p>
      <p><strong>Experience:</strong> ${experience}</p>
      <p><strong>About:</strong></p><p>${about}</p>
    `,
    attachments: [
      {
        filename: resume.originalname,
        path: resume.path
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Career application email sent to:', to_email);
    res.status(200).json({ message: 'Application sent successfully' });
  } catch (error) {
    console.error('Error sending career application email:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to send application', details: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
