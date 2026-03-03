const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    apptDate: {
        type: Date,
        required: true
    },
    user:{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    restaurant:{
        type: mongoose.Schema.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    numOfTables: {
        type: Number,
        required: [true, 'Please specify the number of tables to reserve'],
        min: [1, 'Number of tables must be at least 1'],
        max: [3, 'Cannot reserve more than 3 tables per reservation']
    },
    status: {
        type: String,
        enum: ['confirmed', 'waitlisted', 'cancelled'],
        default: 'confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
