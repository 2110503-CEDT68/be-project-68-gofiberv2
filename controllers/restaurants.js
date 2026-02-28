const Restaurant = require("../models/Restaurant");

/**
* @swagger
* components:
*   schemas:
*     Restaurant:
*       type: object
*       required:
*         - name
*         - address
*         - tel
*         - openingHours
*       properties:
*         id:
*           type: string
*           format: ObjectId
*           description: The auto-generated id of the restaurant
*           example: 609bda561452242d88d36e37
*         name:
*           type: string
*           description: Restaurant name
*         address:
*           type: string
*           description: House No., Street, Road, District, Province
*         tel:
*           type: string
*           description: telephone number
*         openingHours:
*           type: string
*           description: Opening and closing times (e.g., 09:00-22:00)
*       example:
*         id: 609bda561452242d88d36e37
*         name: Happy Restaurant
*         address: 121 ถ.สุขุมวิท
*         tel: 02-2187000
*         openingHours: 09:00-22:00
*/

/**
* @swagger
* tags:
*   name: Restaurants
*   description: The restaurants managing API
*/

/**
* @swagger
* /restaurants:
*   get:
*     summary: Returns the list of all the restaurants
*     tags: [Restaurants]
*     responses:
*       200:
*         description: The list of the restaurants
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/Restaurant'
*/



//@desc     Get all restaurants
//@route    GET /api/v1/restaurants
//@access   Public
exports.getRestaurants = async (req, res, next) => {
  try {
    let query;

    const reqQuery = { ...req.query };

    const removeFields = ["select", "sort", "page", "limit"];

    removeFields.forEach((param) => delete reqQuery[param]);
    console.log(reqQuery);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`,
    );

    query = Restaurant.find(JSON.parse(queryStr)).populate('reservations');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ");
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Restaurant.countDocuments();

    query = query.skip(startIndex).limit(limit);

    const restaurants = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({ success: true, count: restaurants.length, pagination, data: restaurants });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};



/**
* @swagger
* /restaurants/{id}:
*   get:
*     summary: Get the restaurant by id
*     tags: [Restaurants]
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The restaurant id
*     responses:
*       200:
*         description: The restaurant description by id
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Restaurant'
*       404:
*         description: The restaurant was not found
*/

//@desc     Get single restaurant
//@route    GET /api/v1/restaurants/:id
//@access   Public
exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: `No restaurant with the id of ${req.params.id}` });
    }

    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};


/**
* @swagger
* /restaurants:
*   post:
*     summary: Create a new restaurant
*     tags: [Restaurants]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/Restaurant'
*     responses:
*       201:
*         description: The restaurant was successfully created
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Restaurant'
*       500:
*         description: Some server error
*/



//@desc     Create new restaurant
//@route    POST /api/v1/restaurants
//@access   Private
exports.createRestaurant = async (req, res, next) => {
  const restaurant = await Restaurant.create(req.body);
  res.status(201).json({
    success: true,
    data: restaurant,
  });
};


/**
* @swagger
* /restaurants/{id}:
*   put:
*     summary: Update the restaurant by the id
*     tags: [Restaurants]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The restaurant id
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/Restaurant'
*     responses:
*       200:
*         description: The restaurant was updated
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Restaurant'
*       404:
*         description: The restaurant was not found
*       500:
*         description: Some error happened
*/


//@desc     Update restaurant
//@route    PUT /api/v1/restaurants/:id
//@access   Private
exports.updateRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: `No restaurant with the id of ${req.params.id}` });
    }


    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};



/**
* @swagger
* /restaurants/{id}:
*   delete:
*     summary: Remove the restaurant by id
*     tags: [Restaurants]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The restaurant id
*     responses:
*       200:
*         description: The restaurant was deleted
*       404:
*         description: The restaurant was not found
*/




//@desc     Delete restaurant
//@route    DELETE /api/v1/restaurants/:id
//@access   Private
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: `No restaurant with the id of ${req.params.id}` });
    }

    await restaurant.deleteOne();
    
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};