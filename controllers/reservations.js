const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

/**
* @swagger
* components:
*   schemas:
*     Reservation:
*       type: object
*       required:
*         - apptDate
*       properties:
*         id:
*           type: string
*           format: ObjectId
*           description: The auto-generated id of the reservation
*           example: 660ac1776510887820712217
*         apptDate:
*           type: string
*           format: date
*           description: Date of reservation
*         user:
*           type: string
*           format: ObjectId
*           description: The user ID
*           example: 660ab1234510887820712217
*         restaurant:
*           type: string
*           format: ObjectId
*           description: The restaurant ID
*           example: 609bda561452242d88d36e37
*         createdAt:
*           type: string
*           format: date
*           description: Date when created
*       example:
*         id: 660ac1776510887820712217
*         apptDate: 2022-04-20
*         user: 660ab1234510887820712217
*         restaurant: 609bda561452242d88d36e37
*         createdAt: 2022-04-18
*/

/**
* @swagger
* tags:
*   name: Reservations
*   description: The reservations managing API
*/

/**
* @swagger
* /reservations:
*   get:
*     summary: Returns the list of all the reservations
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: The list of the reservations
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/Reservation'
*/



// @desc    Get all reservations
// @route   GET /api/v1/reservations
// @access  Public
exports.getReservations = async (req, res, next) => {
    let query;

    // General user can only see their own reservations
    if(req.user.role !== 'admin'){
        query = Reservation.find({ user: req.user.id }).populate({
            path: 'restaurant',
            select: 'name address tel'
        });
    } else { // Admin can see all
        if (req.params.restaurantId) {
            query = Reservation.find({ restaurant: req.params.restaurantId }).populate({
                path: 'restaurant',
                select: 'name address tel'
            });
        } else {
            query = Reservation.find().populate({
                path: 'restaurant',
                select: 'name address tel'
            });
        }
    }
    try {
        const reservations = await query;

        res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Cannot find Reservation" });
    }
};


/**
* @swagger
* /reservations/{id}:
*   get:
*     summary: Get the reservation by id
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The reservation id
*     responses:
*       200:
*         description: The reservation description by id
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Reservation'
*       404:
*         description: The reservation was not found
*/

// @desc    Get single reservation
// @route   GET /api/v1/reservations/:id
// @access  Public
exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'restaurant',
            select: 'name address tel'
        });

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }
        
        // Make sure user is the reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this reservation` });
        }

        res.status(200).json({
            success: true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Reservation" });
    }
};



/**
* @swagger
* /restaurants/{restaurantId}/reservations:
*   post:
*     summary: Create a new reservation
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: restaurantId
*         schema:
*           type: string
*         required: true
*         description: The restaurant id
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - apptDate
*             properties:
*               apptDate:
*                 type: string
*                 format: date
*                 description: Date of reservation
*     responses:
*       201:
*         description: The reservation was successfully created
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Reservation'
*       400:
*         description: The user has already made 3 reservations
*       404:
*         description: The restaurant was not found
*       500:
*         description: Some server error
*/

// @desc    Add reservation
// @route   POST /api/v1/restaurants/:restaurantId/reservations
// @access  Private
exports.addReservation = async (req, res, next) => {
    try {
        req.body.restaurant = req.params.restaurantId;

        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: `No restaurant with the id of ${req.params.restaurantId}` });
        }

        req.body.user = req.user.id;

        // Check for existed reservations
        const existedReservations = await Reservation.find({ user: req.user.id});
        
        // If the user is not an admin, they can only create 3 reservations
        if (existedReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `The user with ID ${req.user.id} has already made 3 reservations` });
        }

        const reservation = await Reservation.create(req.body);
        
        res.status(201).json({
            success: true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot create Reservation" });
    }
};

/**
* @swagger
* /reservations/{id}:
*   put:
*     summary: Update the reservation by the id
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The reservation id
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - apptDate
*             properties:
*               apptDate:
*                 type: string
*                 format: date
*                 description: Date of reservation
*     responses:
*       200:
*         description: The reservation was updated
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Reservation'
*       404:
*         description: The reservation was not found
*       500:
*         description: Some error happened
*/

// @desc    Update reservation
// @route   PUT /api/v1/reservations/:id
// @access  Private
exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        // Make sure user is the reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this reservation` });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot update Reservation" });
    }
}

/**
* @swagger
* /reservations/{id}:
*   delete:
*     summary: Remove the reservation by id
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The reservation id
*     responses:
*       200:
*         description: The reservation was deleted
*       404:
*         description: The reservation was not found
*/

// @desc    Delete reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
exports.deleteReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        // Make sure user is the reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this reservation` });
        }

        await reservation.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot delete Reservation" });
    }
}
