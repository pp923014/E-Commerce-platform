import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createNewOrder, capturePayment } from "@/store/shop/order-slice";
import { useToast } from "@/components/ui/use-toast";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

function ShoppingCheckout() {
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);
  const [isPaymentStart, setIsPaymentStart] = useState(false);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  const totalCartAmount =
    cartItems && cartItems.items && cartItems.items.length > 0
      ? cartItems.items.reduce(
        (sum, currentItem) =>
          sum +
          (currentItem?.salePrice > 0
            ? currentItem?.salePrice
            : currentItem?.price) *
          currentItem?.quantity,
        0
      )
      : 0;

  async function handleInitiateStripePayment() {
    // ── Validations (same as before) ──────────────────────────────
    if (!cartItems?.items || cartItems.items.length === 0) {
      toast({
        title: "Your cart is empty. Please add items to proceed",
        variant: "destructive",
      });
      return;
    }

    if (!currentSelectedAddress) {
      toast({
        title: "Please select one address to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!stripe || !elements) return;

    setIsPaymentStart(true);

    // ── Build order payload (same shape as before, paymentMethod updated) ──
    const orderData = {
      userId: user?.id,
      cartId: cartItems?._id,
      cartItems: cartItems.items.map((singleCartItem) => ({
        productId: singleCartItem?.productId,
        title: singleCartItem?.title,
        image: singleCartItem?.image,
        price:
          singleCartItem?.salePrice > 0
            ? singleCartItem?.salePrice
            : singleCartItem?.price,
        quantity: singleCartItem?.quantity,
      })),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        address: currentSelectedAddress?.address,
        city: currentSelectedAddress?.city,
        pincode: currentSelectedAddress?.pincode,
        phone: currentSelectedAddress?.phone,
        notes: currentSelectedAddress?.notes,
      },
      orderStatus: "pending",
      paymentMethod: "stripe",      // ← changed from "paypal"
      paymentStatus: "pending",
      totalAmount: totalCartAmount,
      orderDate: new Date(),
      orderUpdateDate: new Date(),
      paymentId: "",
      payerId: "",
    };

    try {
      // ── Step 1: Create order + get clientSecret from backend ──────
      const result = await dispatch(createNewOrder(orderData));

      if (!result?.payload?.success) {
        toast({ title: "Failed to initiate payment", variant: "destructive" });
        setIsPaymentStart(false);
        return;
      }

      const { clientSecret, orderId } = result.payload;

      // ── Step 2: Confirm card payment via Stripe ───────────────────
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (error) {
        toast({ title: error.message, variant: "destructive" });
        setIsPaymentStart(false);
        return;
      }

      // ── Step 3: Tell backend to confirm order & deduct stock ───────
      if (paymentIntent.status === "succeeded") {
        const captureResult = await dispatch(
          capturePayment({
            paymentIntentId: paymentIntent.id,
            orderId,
          })
        );

        if (captureResult?.payload?.success) {
          toast({ title: "Order placed successfully! 🎉" });
          // optionally redirect: navigate("/shop/order-success")
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Something went wrong!", variant: "destructive" });
    } finally {
      setIsPaymentStart(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover object-center" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        <Address
          selectedId={currentSelectedAddress}
          setCurrentSelectedAddress={setCurrentSelectedAddress}
        />
        <div className="flex flex-col gap-4">
          {cartItems?.items?.length > 0
            ? cartItems.items.map((item) => (
              <UserCartItemsContent key={item.productId} cartItem={item} />
            ))
            : null}

          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">₹{totalCartAmount}</span>
            </div>
          </div>

          {/* ── Stripe Card Input ── */}
          <div className="border rounded-md p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": { color: "#aab7c4" },
                  },
                  invalid: { color: "#9e2146" },
                },
              }}
            />
          </div>

          <div className="mt-4 w-full">
            <Button
              onClick={handleInitiateStripePayment}
              disabled={isPaymentStart || !stripe}
              className="w-full"
            >
              {isPaymentStart ? "Processing Payment..." : "Checkout with Stripe"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCheckout;