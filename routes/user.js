const express = require('express');
const router = express.Router();
const userController = require('../controller/userController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')
const auth = require('../middleware/auth')

/* GET home page. */
router.get('/',auth.userAuth,userController.getHomePage)

/*  GET Signup Page */
router.get('/signup',userController.getSignupPage)

/*  POST Signup Page */
router.post('/signup', userController.doSignup)

/*  Get Login Page */
router.get('/login',userController.getLoginPage)

/*  Post Login Page */
router.post('/login', userController.dopostLogin)

// // POST OTP LOGIN
router.post('/otp-login', userController.otpLogin)

// //otp Verify
router.post('/otp-verify', userController.otpVerify)

// // GET Logout 
router.get('/logout', userController.logout)

// /*  Contact Page */
// router.get('/contact', userController.getContactPage)

// // GET SHOP PAGE
router.get('/shop',auth.userAuth,userController.getShopPage)

// // GET Product Details
router.get('/product-details/:id',auth.userAuth, userController.getProductDetails)

// //GET BACK PAGE
router.get('/back',auth.userAuth, userController.getBackPage)

// /* GET Cart Page */
router.get('/cart',auth.userAuth,cartController.getCart)

// /* POST ADD To Cart Page */
router.post('/add-to-cart/:id',  cartController.addToCart)

// /* POST Update cart quantity Page */
router.patch('/change-product-quantity',  cartController.updateQuantity)

// /* Delete product from cart*/
router.delete('/delete-product-cart',  cartController.deleteProduct)

// /* GET Check Out Page */
router.get('/check-out',auth.userAuth, orderController.getCheckOut)

// /* GET User Profile Page */
router.get('/get-profile',auth.userAuth,orderController.getProfil)

// /* POST Address Page */
router.route('/add-address').post( orderController.postAddress)

// /* DELETE  Address Page */
router.route( '/delete-address/:id').delete(orderController.deleteAddress)

// /* POST Check Out Page */
router.post('/check-out', orderController.postCheckOut)

//Verify Payment
router.route('/verify_payment').post(orderController.verifyPayment)

// GET PROFAIL PAGE
// router.get('/profail',userController.getProfail)

/* GET Order Details Page */
router.route('/order-details/:id').get( orderController.orderDetails)

//  Post cansel Order
router.route('/cancel-order/').post(orderController.cancelOrder)



module.exports = router;
