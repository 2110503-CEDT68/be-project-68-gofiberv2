const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number']
    },
    openingHours: {
        type: String,
        required: [true, 'Please add opening and closing times (e.g., 09:00-22:00)']
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Reverse populate with virtuals
RestaurantSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'restaurant',
    justOne: false
});

// Cascade delete reservations when a restaurant is deleted
RestaurantSchema.pre('deleteOne', { document: true, query: false }, async function () {
    console.log(`Reservations being removed from restaurant ${this._id}`);
    await this.model('Reservation').deleteMany({ restaurant: this._id });
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);