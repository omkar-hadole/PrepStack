const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { Admin } = require('../models'); 

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepstack');
        console.log('Connected to DB');

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminPassword) {
            console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
            process.exit(1);
        }

        const existing = await Admin.findOne({ username: adminUsername });
        if (existing) {
            console.log('Admin already exists');
        } else {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            const admin = new Admin({
                username: adminUsername,
                passwordHash
            });
            await admin.save();
            console.log('Admin created successfully');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
