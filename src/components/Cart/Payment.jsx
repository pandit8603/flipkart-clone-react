import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PriceSidebar from "./PriceSidebar";
import Stepper from "./Stepper";
import {
    CardNumberElement,
    CardCvcElement,
    CardExpiryElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { clearErrors, newOrder } from "../../actions/orderAction";
import { useSnackbar } from "notistack";
import MetaData from "../Layouts/MetaData";
import { emptyCart } from "../../actions/cartAction";
import { useNavigate } from "react-router-dom";

const Payment = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const stripe = useStripe();
    const elements = useElements();
    const paymentBtn = useRef(null);

    const [payDisable, setPayDisable] = useState(false);

    const { shippingInfo, cartItems } = useSelector((state) => state.cart);
    const { user } = useSelector((state) => state.user);
    const { error } = useSelector((state) => state.newOrder);

    const totalPrice = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const paymentData = {
        amount: Math.round(totalPrice),
        email: user.email,
        phoneNo: shippingInfo.phoneNo,
    };

    const order = {
        shippingInfo,
        orderItems: cartItems,
        totalPrice,
    };

    const submitHandler = async (e) => {
        e.preventDefault();

        paymentBtn.current.disabled = true;
        setPayDisable(true);

        try {
            const config = {
                headers: {
                    "Content-Type": "application/json",
                },
            };

            const { data } = await axios.post(
                "/api/v1/payment/process",
                paymentData,
                config
            );
            if (!stripe || !elements) return;

            const result = await stripe.confirmCardPayment(data?.client_secret, {
                payment_method: {
                    card: elements.getElement(CardNumberElement),
                    billing_details: {
                        name: user.name,
                        email: user.email,
                        address: {
                            line1: shippingInfo.address,
                            city: shippingInfo.city,
                            country: shippingInfo.country,
                            state: shippingInfo.state,
                            postal_code: shippingInfo.pincode,
                        },
                    },
                },
            });

            if (result.error) {
                paymentBtn.current.disabled = false;
                enqueueSnackbar(result.error.message, { variant: "error" });
            } else {
                if (result.paymentIntent.status === "succeeded") {
                    order.paymentInfo = {
                        id: result.paymentIntent.id,
                        status: result.paymentIntent.status,
                    };

                    dispatch(newOrder(order));
                    dispatch(emptyCart());

                    navigate("/orders/success");
                } else {
                    enqueueSnackbar("Processing Payment Failed!", { variant: "error" });
                }
            }
        } catch (error) {
            paymentBtn.current.disabled = false;
            setPayDisable(false);
            enqueueSnackbar(error, { variant: "error" });
        }
    };

    useEffect(() => {
        if (error) {
            dispatch(clearErrors());
            enqueueSnackbar(error, { variant: "error" });
        }
    }, [dispatch, error, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Flipkart: Secure Payment | Paytm" />

            <main className="w-full mt-20">
                {/* <!-- row --> */}
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-11/12 mt-0 sm:mt-4 m-auto sm:mb-7">
                    {/* <!-- cart column --> */}
                    <div className="flex-1">
                        <Stepper activeStep={3}>
                            <div className="w-full bg-white">
                                {/* stripe form */}
                                <form
                                    onSubmit={(e) => submitHandler(e)}
                                    autoComplete="off"
                                    className="flex flex-col justify-start gap-3 w-full sm:w-3/4 mx-8 my-4"
                                >
                                    <div>
                                        <CardNumberElement />
                                    </div>
                                    <div>
                                        <CardExpiryElement />
                                    </div>
                                    <div>
                                        <CardCvcElement />
                                    </div>
                                    <input
                                        type="submit"
                                        value={`Pay ₹${totalPrice.toLocaleString()}`}
                                        disabled={payDisable ? true : false}
                                        className={`${payDisable
                                            ? "bg-primary-grey cursor-not-allowed"
                                            : "bg-primary-orange cursor-pointer"
                                            } w-1/2 sm:w-1/4 my-2 py-3 font-medium text-white shadow hover:shadow-lg rounded-sm uppercase outline-none`}
                                    />
                                </form>
                                {/* stripe form */}
                            </div>
                        </Stepper>
                    </div>

                    <PriceSidebar cartItems={cartItems} />
                </div>
            </main>
        </>
    );
};

export default Payment;
