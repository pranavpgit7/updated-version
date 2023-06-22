const express = require('express')
const { ObjectId } = require('mongodb');

const cartModel = require('../models/cartShema')
const addressModel = require('../models/addressShema')
const orderModel = require('../models/orderSchema');
const userModel = require('../models/userSchema')
const productModel = require('../models/productSchema')
const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: "rzp_test_N0XireAFL5NvER",
    key_secret: "koMtvKpOkekmWCEKAPbNAfjR",
  });


module.exports = {


    // to get the total amount in the cart lising page

    totalCheckOutAmount: (userId) => {
        try {
            return new Promise((resolve, reject) => {
                cartModel.Cart.aggregate([
                    {
                        $match: {
                            user: new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$cartItems"
                    },
                    {

                        $lookup: {
                            from: "products",
                            localField: "cartItems.productId",
                            foreignField: "_id",
                            as: "carted"
                        }
                    },
                    {
                        $project: {
                            item: "$cartItems.productId",
                            quantity: "$cartItems.quantity",
                            price: {
                                $cond: {
                                    if: { $gt: [{ $arrayElemAt: ["$carted.discountedPrice", 0] }, 0] },
                                    then: { $arrayElemAt: ["$carted.discountedPrice", 0] },
                                    else: { $arrayElemAt: ["$carted.price", 0] }
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ["$quantity", "$price"] } }
                        }
                    }
                ])
                    .then((total) => {
                        resolve(total[0]?.total)
                    })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    //to get the sub total 
    getSubTotal: (userId) => {
        try {
            return new Promise((resolve, reject) => {
                cartModel.Cart.aggregate([
                    {
                        $match: {
                            user: new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$cartItems"
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "cartItems.productId",
                            foreignField: "_id",
                            as: "carted"
                        }
                    },
                    {
                        $project: {
                            item: "$cartItems.productId",
                            quantity: "$cartItems.quantity",
                            price: {
                                $cond: {
                                    if: { $gt: [{ $arrayElemAt: ["$carted.discountedPrice", 0] }, 0] },
                                    then: { $arrayElemAt: ["$carted.discountedPrice", 0] },
                                    else: { $arrayElemAt: ["$carted.price", 0] }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            total: { $multiply: ["$quantity", "$price"] }
                        }
                    }
                ])
                    .then((total) => {
                        const totals = total.map(obj => obj.total)
                        resolve({ total, totals })
                    })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    /* GET Orders Page */
    getOrders: (userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.findOne({ user: userId }).sort({ createdAt: -1 }).then((user) => {
                    resolve(user)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    /* GET Address Page */
    getAddress: (userId) => {
        return new Promise((resolve, reject) => {
            addressModel.Address.findOne({ user: userId }).then((response) => {
                resolve(response)
            })

        })
    },

    /* POST Address Page */
    postAddress: (data, userId) => {
        try {
            return new Promise((resolve, reject) => {
                let addressInfo = {
                    fname: data.fname,
                    lname: data.lname,
                    street: data.street,
                    appartment: data.appartment,
                    city: data.city,
                    state: data.state,
                    zipcode: data.zipcode,
                    phone: data.phone,
                    email: data.email
                }

                addressModel.Address.findOne({ user: userId }).then(async (ifAddress) => {
                    if (ifAddress) {
                        addressModel.Address.updateOne(
                            { user: userId },
                            {
                                $push: { Address: addressInfo }
                            }
                        ).then((response) => {
                            resolve(response)
                        })
                    } else {
                        let newAddress = addressModel.Address({ user: userId, Address: addressInfo })

                        await newAddress.save().then((response) => {
                            resolve(response)
                        })
                    }
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

 
     // Place Order
     placeOrder: (data) => {
        console.log(data.total,'dissss');
        try {
            let flag = 0
            return new Promise(async (resolve, reject) => {
                let productDetails = await cartModel.Cart.aggregate([
                    {
                        $match: {
                            user: new ObjectId(data.user)
                        }
                    },
                    {
                        $unwind: '$cartItems'
                    },
                    {
                        $project: {
                            item: "$cartItems.productId",
                            quantity: "$cartItems.quantity"
                        }
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "item",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    {
                        $unwind: "$productDetails"

                    },
                    {
                        $project: {

                            productId: "$productDetails._id",
                            productName: "$productDetails.name",
                            productPrice: "$productDetails.price",
                            brand: "$productDetails.brand",
                            quantity: "$quantity",
                            category: "$productDetails.category",
                            image: "$productDetails.img"
                        }
                    }
                ])

                let Address = await addressModel.Address.aggregate([
                    {
                        $match: { user: new ObjectId(data.user) }
                    },
                    {
                        $unwind: "$Address"
                    },
                    {
                        $match: { "Address._id": new ObjectId(data.address) }
                    },
                    {
                        $project: { item: "$Address" }
                    }
                ])
                if (Address.length === 0) {
                    reject(new Error("User does not have an address."))
                    return; // Exit the function to prevent further execution
                }

                let status, orderStatus;
                if (data.payment_option === "COD") {
                    status = "Placed",
                        orderStatus = "Success"

                } else if (data.payment_option === 'wallet') {
                    let userData = await userModel.user.findById({ _id: data.user })
                    if (userData.wallet < data.total) {
                        flag = 1
                        reject(new Error("Insufficient wallet balance!"))

                    } else {
                        userData.wallet -= data.total

                        await userData.save()
                        status = 'Placed',
                            orderStatus = 'Success'
                    }

                } else {
                    status = "Pending",
                        orderStatus = "Pending"
                }

                let orderData = {
                    name: Address[0].item.fname,                                                                                                                                                                                                                                                                                                                                                                                                               
                    paymentStatus: status,
                    paymentMethod: data.payment_option,
                    productDetails: productDetails,
                    shippingAddress: Address,
                    orderStatus: orderStatus,
                    totalPrice: data.total
                }
                let order = await orderModel.order.findOne({ user: data.user })


                if (flag == 0) {
                    if (order) {
                        await orderModel.order.updateOne(
                            { user: data.user },
                            {
                                $push: { orders: orderData }
                            }
                        ).then((response) => {
                            resolve(response)
                        })
                    } else {
                        let newOrder = orderModel.order({
                            user: data.user,
                            orders: orderData
                        })
                        await newOrder.save().then((response) => {
                            resolve(response)
                        })
                    }
                    
                    //inventory management 
                    // update product quantity in the database
                    for (let i = 0; i < productDetails.length; i++) {
                        let purchasedProduct = productDetails[i];
                        let originalProduct = await productModel.Product.findById(purchasedProduct.productId);
                        let purchasedQuantity = purchasedProduct.quantity;
                        originalProduct.quantity -= purchasedQuantity;
                        await originalProduct.save();
                        await cartModel.Cart.deleteMany({ user: data.user }).then(() => {
                            resolve()
                        })

                    }

                }

            })
        } catch (error) {
            throw error;
        }
    },

    /* PATCH Address Page */
    // patchEditAddress: (userId, addressId, UserData) => {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             await addressModel.Address
    //                 .updateOne(
    //                     {
    //                         user: new ObjectId(userId),
    //                         "Address._id": new ObjectId(addressId),
    //                     },
    //                     {
    //                         $set: {
    //                             "Address.$": UserData,
    //                         },
    //                     }
    //                 )
    //                 .then((response) => {
    //                     resolve(response);
    //                 });
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // },

    /* GET Edit Address Page */
    // getEditAddress: (addressId, userId) => {
    //     return new Promise((resolve, reject) => {
    //         addressModel.Address.aggregate([
    //             {
    //                 $match: {
    //                     user: new ObjectId(userId)
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     address: {
    //                         $filter: {
    //                             input: "$Address",
    //                             as: "item",
    //                             cond: { $eq: ["$$item._id", new ObjectId(addressId)] }
    //                         }
    //                     }
    //                 }
    //             }
    //         ])
    //             .then(result => {
    //                 if (result.length === 0) {
    //                     resolve(null); // Address not found
    //                 } else {
    //                     resolve(result[0].address[0]); // Return the matched address
    //                 }
    //             })
    //             .catch(error => {
    //                 reject(error);
    //             });
    //     });
    // },


    /* DELETE  Address Page */
    deleteAddress: (userId, addressId) => {
        return new Promise((resolve, reject) => {
            addressModel.Address.updateOne(
                { user: new ObjectId(userId) },
                { $pull: { Address: { _id: new ObjectId(addressId) } } }
            ).then((response) => {
                resolve(response)
            })
        })

    },

     //cancel order
     cancelOrder: async (orderId) => {
        try {
          const orders = await orderModel.order.find({ 'orders._id': orderId });
          const orderIndex = orders[0].orders.findIndex((order) => order._id == orderId);
          const order = orders[0].orders.find((order) => order._id == orderId);
          
          if (order.paymentMethod === 'COD' && order.orderConfirm === 'Delivered' && order.paymentStatus === 'paid') {
            // Update order status and payment status in the database
            await orderModel.order.updateOne(
              { 'orders._id': orderId },
              {
                $set: {
                  ['orders.' + orderIndex + '.orderConfirm']: 'Canceled',
                  ['orders.' + orderIndex + '.paymentStatus']: 'Refunded'
                }
              }
            );
          } else {
            // Update order status in the database
            await orderModel.order.updateOne(
              { 'orders._id': orderId },
              {
                $set: {
                  ['orders.' + orderIndex + '.orderConfirm']: 'Canceled'
                }
              }
            );
          }
          
          return true; // Or you can return any relevant data
        } catch (error) {
          console.log(error.message);
          throw error;
        }
      },
      

    // getting orders for order details page 
    findOrder: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId),
                            user: new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },
                ]).then((response) => {
                    let orders = response.filter((element) => {
                        if (element.orders._id == orderId) {

                            return true;
                        }
                        return false;
                    }).map((element) => element.orders);
                    resolve(orders)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    // getting address for order details page 

    findAddress: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId),
                            user: new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $unwind: "$orders.shippingAddress"
                    },
                    {
                        $replaceRoot: { newRoot: "$orders.shippingAddress.item" }
                    },
                    {
                        $project: {
                            _id: 1,
                            fname: 1,
                            lname: 1,
                            street: 1,
                            appartment: 1,
                            city: 1,
                            state: 1,
                            zipcode: 1,
                            phone: 1,
                            email: 1
                        }
                    }
                ]).then((response) => {
                    // console.log(response[0].phone,'[[');
                    resolve(response)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    // getting products for order details page 

    findProduct: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId),
                            user: new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },



                ]).then((response) => {
                    let product = response.filter((element) => {
                        if (element.orders._id == orderId) {

                            return true;
                        }
                        return false;
                    }).map((element) => element.orders.productDetails);
                    resolve(product)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },


    //to get the order address of the user
    getOrderAddress: (userId, orderId) => {
        return new Promise((resolve, reject) => {
            orderModel.order.aggregate([
                {
                    $match: {
                        "user": new ObjectId(userId)
                    }
                },
                {
                    $unwind: "$orders"
                },
                {
                    $match: {
                        "orders._id": new ObjectId(orderId)
                    }
                },
                {
                    $unwind: "$orders.shippingAddress"
                },
                {
                    $project: {
                        "shippingAddress": "$orders.shippingAddress"
                    }
                }
            ]).then((address) => {
                resolve(address)
            })

        })
    },

     //to get the current order
     getSubOrders: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            'user': new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: '$orders'

                    },
                    {
                        $match: {
                            'orders._id': new ObjectId(orderId)
                        }
                    }

                ]).then((order) => {
                    resolve(order)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    //to get the ordered products of the user
    getOrderedProducts: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "user": new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId)
                        }
                    },
                    {
                        $unwind: "$orders.productDetails"
                    },
                    {
                        $project: {
                            "productDetails": "$orders.productDetails"
                        }
                    }
                ]).then((response) => {
                    resolve(response)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    // to get the total of a certain product by multiplying with the quantity
    getTotal: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "user": new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId)
                        }
                    },
                    {
                        $unwind: "$orders.productDetails"
                    },
                    {
                        $project: {
                            "productDetails": "$orders.productDetails",

                            "totalPrice": { $multiply: ["$orders.productDetails.productPrice", "$orders.productDetails.quantity"] }
                        }
                    }
                ]).then((response) => {
                    resolve(response)
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },

    //to find the total of the order
    getOrderTotal: (orderId, userId) => {
        try {
            return new Promise((resolve, reject) => {
                orderModel.order.aggregate([
                    {
                        $match: {
                            "user": new ObjectId(userId)
                        }
                    },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId)
                        }
                    },
                    {
                        $unwind: "$orders.productDetails"
                    },
                    {
                        $group: {
                            _id: "$orders._id",
                            totalPrice: { $sum: "$orders.productDetails.productPrice" }
                        }
                    }

                ]).then((response) => {
                    if (response && response.length > 0) {
                        const orderTotal = response[0].totalPrice
                        resolve(orderTotal)
                    }
                })
            })
        } catch (error) {
            console.log(error.message);
        }
    },
    // get order by date

    getOrderByDate: () => {
        return new Promise(async (resolve, reject) => {
            const startDate = new Date();
            try {
                const response = await orderModel.order.find({ 'orders.createdAt': { $lt: startDate } });
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    },

    getOrderByCategory: () => {
        return new Promise(async (resolve, reject) => {
            await orderModel.order.aggregate([
                { $unwind: "$orders" },
            ]).then((response) => {
                const productDetails = response.map(order => order.orders.productDetails);
                resolve(productDetails)

            })
        })
    },

     //to get all orders for admin
     getAllOrders: () => {
        try {
          return new Promise((resolve, reject) => {
            orderModel.order.find().then((orders) => {
              let totalOrders = 0;
              orders.forEach((order) => {
                totalOrders += order.orders.length;
              });
              resolve(totalOrders);
            });
          });
        } catch (error) {
          console.log(error.message);
        }
      },

      getAllOrdersSum: () => {
        try {
          return new Promise((resolve, reject) => {
            orderModel.order.find().then((orders) => {
              let totalSum = 0;
              console.log(orders,'order');
              orders.forEach((order) => {
                order.orders.forEach((item) => {
                  totalSum += item.totalPrice;
                  console.log(totalSum,'sum');
                });
              });
              resolve(totalSum);
            });
          });
        } catch (error) {
          console.log(error.message);
        }
      },

         // creat razorpay

         generateRazorpay: async (userId, total) => {
            console.log(userId, 'user');
            return new Promise(async (resolve, reject) => {
              try {
                let orders = await orderModel.order.find({ user: userId });
                console.log(orders, 'orderr');
          
                let order = orders[0].orders.slice().reverse();
                let orderId = order[0]._id;
                
                total = total * 100;
                var options = {
                  amount: parseInt(total),
                  currency: "INR",
                  receipt: "" + orderId,
                };
                instance.orders.create(options, function (err, order) {
                  if (err) {
                    console.log('err1');
                    reject(err);
                  } else {
                    console.log(order,'succ');
                    resolve(order);
                  }
                });
              } catch (err) {
                console.log('errr2');
                reject(err);
              }
            });
          },
          

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      try {
        const crypto = require("crypto");
        let hmac = crypto.createHmac("sha256", 'koMtvKpOkekmWCEKAPbNAfjR');
        hmac.update(
          details["payment[razorpay_order_id]"] +
            "|" +
            details["payment[razorpay_payment_id]"]
        );
        hmac = hmac.digest("hex");
        if (hmac == details["payment[razorpay_signature]"]) {
            console.log('1');
          resolve();
        } else {
            console.log('2');
          reject("not match");
        }
      } catch (err) {}
    });
  },

  // change paymentStatus
changePaymentStatus: (userId, orderId) => {
    try {
        return new Promise(async (resolve, reject) => {
            await orderModel.order.updateOne(
                { "orders._id": orderId },
                {
                    $set: {
                        "orders.$.orderConfirm": "Success",
                        "orders.$.paymentStatus": "Paid"
                    }
                }
            ),
                cartModel.Cart.deleteMany({ user: userId }).then(() => {
                    resolve()
                })
        })
    } catch (error) {
        console.log(error.message);
    }
},




}