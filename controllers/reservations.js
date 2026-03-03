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
*         - numOfTables
*       properties:
*         id:
*           type: string
*           format: ObjectId
*           description: The auto-generated id of the reservation
*           example: 660ac1776510887820712217
*         apptDate:
*           type: string
*           format: date-time
*           description: Date and time of reservation
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
*         numOfTables:
*           type: integer
*           description: Number of tables to reserve (1-n)
*           minimum: 1
*           maximum: n
*         status:
*           type: string
*           enum: [confirmed, waitlisted, cancelled]
*           description: Reservation status
*           default: confirmed
*         createdAt:
*           type: string
*           format: date
*           description: Date when created
*       example:
*         id: 660ac1776510887820712217
*         apptDate: 2022-04-20T18:00:00.000Z
*         user: 660ab1234510887820712217
*         restaurant: 609bda561452242d88d36e37
*         numOfTables: 2
*         status: confirmed
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
* /reservations/promotable:
*   get:
*     summary: Get all waitlisted reservations that can be promoted to confirmed (Admin only)
*     tags: [Reservations]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of waitlisted reservations that have available tables to be promoted
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 count:
*                   type: integer
*                 data:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Reservation'
*       401:
*         description: Not authorized
*       403:
*         description: Forbidden - Admin only
*/

// @desc    Get promotable waitlisted reservations
// @route   GET /api/v1/reservations/promotable
// @access  Private/Admin
exports.getPromotableWaitlists = async (req, res, next) => {
    try {
        // Get all waitlisted reservations sorted by createdAt (first come, first serve)
        const waitlistedReservations = await Reservation.find({ status: 'waitlisted' })
            .sort({ createdAt: 1 })
            .populate({ path: 'restaurant', select: 'name address tel totalTables' })
            .populate({ path: 'user', select: 'name email tel' });

        let promotable = [];

        // Check each waitlisted reservation
        for (const waitlist of waitlistedReservations) {
            const apptDate = waitlist.apptDate;
            const restaurant = waitlist.restaurant;

            if (!restaurant) continue;

            // Create 2-hour overlap window (Danger Zone)
            const bufferBefore = new Date(apptDate.getTime() - (2 * 60 * 60 * 1000));
            const bufferAfter = new Date(apptDate.getTime() + (2 * 60 * 60 * 1000));

            // Find overlapping CONFIRMED reservations
            const overlappingConfirmed = await Reservation.find({
                restaurant: restaurant._id,
                status: 'confirmed',
                apptDate: {
                    $gt: bufferBefore,
                    $lt: bufferAfter
                }
            });

            // Calculate total tables reserved
            const totalTablesReserved = overlappingConfirmed.reduce((sum, res) => {
                return sum + res.numOfTables;
            }, 0);

            // Calculate available tables
            const availableTables = restaurant.totalTables - totalTablesReserved;

            // Check if this waitlist can fit
            if (waitlist.numOfTables <= availableTables) {
                promotable.push(waitlist);
            }
        }

        res.status(200).json({
            success: true,
            count: promotable.length,
            data: promotable
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot get promotable waitlists" });
    }
};

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
*               - numOfTables
*             properties:
*               apptDate:
*                 type: string
*                 format: date-time
*                 description: Date and time of reservation
*               numOfTables:
*                 type: integer
*                 description: Number of tables to reserve (1-n)
*                 minimum: 1
*                 maximum: n
*     responses:
*       201:
*         description: The reservation was successfully created. Status will be 'confirmed' if tables are available, or 'waitlisted' if fully booked.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 message:
*                   type: string
*                   description: "'Reservation confirmed successfully.' OR 'The restaurant is fully booked for this time slot. You have been added to the waitlist.'"
*                 data:
*                   $ref: '#/components/schemas/Reservation'
*       400:
*         description: Bad Request - User has already made 3 reservations OR invalid numOfTables
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

        // Get the number of tables requested
        const numOfTablesRequested = req.body.numOfTables;

        // Validate numOfTables exists
        if (!numOfTablesRequested) {
            return res.status(400).json({ success: false, message: 'Please specify the number of tables to reserve' });
        }

        // Check if requested tables exceed restaurant's total tables
        if (numOfTablesRequested > restaurant.totalTables) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot reserve ${numOfTablesRequested} tables. Restaurant only has ${restaurant.totalTables} tables in total.` 
            });
        }

        // Check for existed reservations (user can only make 3 reservations)
        const existedReservations = await Reservation.find({ user: req.user.id });
        
        // If the user is not an admin, they can only create 3 reservations
        if (existedReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `The user with ID ${req.user.id} has already made 3 reservations` });
        }

        // Get the appointment date from request
        const apptDate = new Date(req.body.apptDate);

        // Create 2-hour overlap window (Danger Zone)
        const bufferBefore = new Date(apptDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before
        const bufferAfter = new Date(apptDate.getTime() + (2 * 60 * 60 * 1000));  // 2 hours after

        // Find overlapping CONFIRMED reservations within the 2-hour window
        const overlappingReservations = await Reservation.find({
            restaurant: req.params.restaurantId,
            status: 'confirmed',
            apptDate: {
                $gt: bufferBefore,
                $lt: bufferAfter
            }
        });

        // Calculate total tables already reserved in this time window
        const totalTablesReserved = overlappingReservations.reduce((sum, reservation) => {
            return sum + reservation.numOfTables;
        }, 0);

        // Check if there are enough tables available
        const availableTables = restaurant.totalTables - totalTablesReserved;
        
        // Set status based on availability
        if (numOfTablesRequested > availableTables) {
            req.body.status = 'waitlisted';
        } else {
            req.body.status = 'confirmed';
        }

        const reservation = await Reservation.create(req.body);
        
        // Return appropriate message based on status
        if (reservation.status === 'waitlisted') {
            res.status(201).json({
                success: true,
                message: `The restaurant is fully booked for this time slot. You have been added to the waitlist.`,
                data: reservation
            });
        } else {
            res.status(201).json({
                success: true,
                message: 'Reservation confirmed successfully.',
                data: reservation
            });
        }

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
*             properties:
*               apptDate:
*                 type: string
*                 format: date-time
*                 description: Date and time of reservation
*               numOfTables:
*                 type: integer
*                 description: Number of tables to reserve (1-n)
*                 minimum: 1
*                 maximum: n
*               status:
*                 type: string
*                 enum: [confirmed, waitlisted, cancelled]
*                 description: Reservation status (Admin only can change)
*     responses:
*       200:
*         description: The reservation was updated
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Reservation'
*       400:
*         description: Bad Request - The restaurant is fully booked for this time slot
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

        // Get the restaurant to check totalTables
        const restaurant = await Restaurant.findById(reservation.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: `No restaurant found for this reservation` });
        }

        // Store original values before update
        const originalApptDate = reservation.apptDate;
        const originalNumOfTables = reservation.numOfTables;
        const originalStatus = reservation.status;

        if (req.body.status && req.body.status !== originalStatus) {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: `User ${req.user.id} is not authorized to change the reservation status. Only admins can manually promote waitlists.` 
                });
            }
        }

        // Get the updated values (use existing if not provided)
        const numOfTablesRequested = req.body.numOfTables || reservation.numOfTables;
        const newApptDate = req.body.apptDate ? new Date(req.body.apptDate) : reservation.apptDate;

        // Check if requested tables exceed restaurant's total tables
        if (numOfTablesRequested > restaurant.totalTables) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot reserve ${numOfTablesRequested} tables. Restaurant only has ${restaurant.totalTables} tables in total.` 
            });
        }

        // Create 2-hour overlap window for NEW time (Danger Zone)
        const bufferBefore = new Date(newApptDate.getTime() - (2 * 60 * 60 * 1000));
        const bufferAfter = new Date(newApptDate.getTime() + (2 * 60 * 60 * 1000));

        // Find overlapping CONFIRMED reservations, EXCLUDING the current reservation
        const overlappingReservations = await Reservation.find({
            restaurant: reservation.restaurant,
            status: 'confirmed',
            _id: { $ne: req.params.id },
            apptDate: {
                $gt: bufferBefore,
                $lt: bufferAfter
            }
        });

        // Calculate total tables already reserved in this time window
        const totalTablesReserved = overlappingReservations.reduce((sum, res) => {
            return sum + res.numOfTables;
        }, 0);

        // Check if there are enough tables available
        const availableTables = restaurant.totalTables - totalTablesReserved;
        if (numOfTablesRequested > availableTables) {
            return res.status(400).json({ 
                success: false, 
                message: `The restaurant is fully booked for this time slot. Requested: ${numOfTablesRequested}, Available: ${availableTables} out of ${restaurant.totalTables} total tables.` 
            });
        }

        // Perform the update
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
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   type: object
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
