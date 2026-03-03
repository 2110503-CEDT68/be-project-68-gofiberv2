const express = require("express");

const { getReservations, getReservation, addReservation, updateReservation, deleteReservation, getPromotableWaitlists } = require("../controllers/reservations");

const router = express.Router({mergeParams: true});

const { protect, authorize } = require("../middleware/auth");

router.route('/')
    .get(protect, getReservations)
    .post(protect, authorize('admin','user'), addReservation);

router.route('/promotable')
    .get(protect, authorize('admin'), getPromotableWaitlists);

router.route('/:id')
    .get(protect, getReservation)
    .put(protect, authorize('admin','user'), updateReservation)
    .delete(protect, authorize('admin','user'), deleteReservation);

module.exports = router;
