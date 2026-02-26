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
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
