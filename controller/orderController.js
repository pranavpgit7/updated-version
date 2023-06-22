
const express=require('express')
const { ObjectId } = require('mongodb');
const cartHelpers= require('../helpers/cartHelper')
const  userHelper=require('../helpers/userHelper')
const orderHelpers=require('../helpers/orderHelper')

module.exports = {

    
    
    /* GET Check Out Page */
    getCheckOut: async (req, res) => {
        let userId = req.session.user._id
        let users = req.session.user ? req.session.user._id : null;
        let user = req.session.user
        let total = await orderHelpers.totalCheckOutAmount(userId)
        let count = await cartHelpers.getCartCount(userId)
        let address = await orderHelpers.getAddress(userId)
        cartHelpers.getCartItems(userId).then((cartItems) => {
            res.render('user/checkOut', { layout: 'Layout', user,users, cartItems, total, count, address })
        })
    },
    
    
    /* GET Address Page */
    getProfil: async (req, res) => {
          var count = null
          let users = req.session.user
          let userId = req.session.user._id
          
          if (users) {

                var count = await cartHelpers.getCartCount(userId)
                let userData = await userHelper.getUser(userId)
                let address = await orderHelpers.getAddress(userId)
                let orders = await orderHelpers.getOrders(userId)
                
                // let product = await orderHelpers.getProduct()
                console.log(userData,count,address+'hlooooooooo');

                res.render('user/profile', { layout: 'Layout', users, userData, count, address, orders,  })
            }
        
        },
        
        /* POST Address Page */
          postAddress: (req, res) => {
              let data = req.body
              console.log(data,'00');
              let userId = req.session.user._id
              orderHelpers.postAddress(data, userId).then((response) => {
                console.log(response);
                    res.send(response)
                })
            },
            
            /* POST Check Out Page */
            postCheckOut: async (req, res) => {
                try {
                    let userId = req.session.user._id
                    let data = req.body;
                    let total = data.total
                    console.log(data, 'lolol');
                    try {
                        const response = await orderHelpers.placeOrder(data);
                        console.log(data, 'response');
                        if (data.payment_option === "COD") {
                            res.json({ codStatus: true });
                        } else if (data.payment_option === "razorpay") {
                            console.log("Payment is razorPayyy ");
                            await orderHelpers
                                .generateRazorpay(req.session.user._id, total)
                                .then((order) => {
                                    console.log(order,'orderssss----');
                                    res.json(order);
                                });
                        }
                    } catch (error) {
                        
                        res.json({ status: false, error: error.message })
                    }
                } catch (error) {
                    console.error(error,'fal');
                    res.status(500).json({ error: error.message });
                }
            },

       /* GET Edit Address Page */
    //    getEditAddress:(req,res)=>{
    //     let userId = req.session.user._id
    //     let addressId = req.params.id
    //     orderHelpers.getEditAddress(addressId,userId).then((currentAddress)=>{
    //         res.send(currentAddress)
    //     })
    // },
      /* PATCH Edit Address Page */
    //   patchEditAddress:(req,res)=>{
    //     let addressId = req.params.id
    //     let userId = req.session.user._id
    //     let userData = req.body
    //     console.log(userData,'userData');
    //     orderHelpers.patchEditAddress(userId,addressId,userData).then((response)=>{
    //         res.send(response)
    //     })
    // },

      /* DELETE  Address Page */
      deleteAddress:(req,res)=>{
        let userId = req.session.user._id
        let addressId = req.params.id
        console.log(addressId,'lol------------------');
        orderHelpers.deleteAddress(userId,addressId).then((response)=>{
            res.send(response)
        })
    },

    // getting order details
    orderDetails: async (req, res) => {
        let users = req.session?.user
        console.log(users, "users in order controller");
        console.log(users.name, "users name in order controlelr");
        let count = await cartHelpers.getCartCount(users._id)
        let userId = req.session.user._id;
        let orderId = req.params.id;

        orderHelpers.findOrder(orderId, userId).then((orders) => {
            orderHelpers.findAddress(orderId, userId).then((address) => {
                orderHelpers.findProduct(orderId, userId).then((product) => {
                    console.log(orders[0].orderConfirm, '====');
                    res.render('user/orderDetails', { layout: 'Layout', users, count, product, address, orders, orderId })
                })
            })
        })
    },

    cancelOrder: (req, res) => {
        let orderId = req.query.id;
        let total = req.query.total;
        let userId = req.session.user._id
        console.log(orderId);
        orderHelpers.cancelOrder(orderId).then((canceled) => {
            res.send(canceled)
            // })
        })
    },

    // verifyPayment: (req, res) => {
    //     console.log(req.session.user._id,'uuuu');
    //     console.log('came');
    //     console.log(req.body,'ppp');
    //     orderHelpers.verifyPayment(req.body).then(() => {
    //         orderHelpers.changePaymentStatus(req.session.user._id, req.body["order[receipt]"])
    //             .then(() => {
    //                 console.log('true');
    //                 res.json({ status: true })
    //             })
    //             .catch((err) => {
    //                 console.log('false');
    //                 res.json({ status: false })
    //             })
    //     })
    // },
    verifyPayment: async (req, res) => {
        try {
          console.log(req.session.user._id, 'uuuu');
          console.log('came');
          console.log(req.body, 'ppp');
          
          await orderHelpers.verifyPayment(req.body);
          
          await orderHelpers.changePaymentStatus(req.session.user._id, req.body["order[receipt]"]);
      
          console.log('true');
          res.json({ status: true });
        } catch (err) {
          console.log('Error:', err);
          console.log('false');
          res.json({ status: false });
        }
      }
      

    


}
