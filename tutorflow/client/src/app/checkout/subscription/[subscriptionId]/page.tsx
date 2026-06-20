"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Initialize Stripe with a test key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_51TczAkBgkNOiJ0Bu6VePZ9uHnj6dZsI7CAr8PnAzCvbXzcyIoOviGexwEgFjO8x9EbpMlXqK6LsvZuG6RFB89rw800WMS7XK2Q');

const CheckoutForm = ({ planPrice, planName, subscriptionId }: { planPrice: number, planName: string, subscriptionId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // Verify with the backend
        await api.post('/api/subscriptions/verify-payment', { subscriptionId });
        router.push('/checkout/success');
      } catch (err) {
        setErrorMessage('Payment succeeded, but failed to verify on our servers. Please contact support.');
        setIsProcessing(false);
      }
    } else {
      setErrorMessage('Unexpected status: ' + paymentIntent?.status);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && <div className="text-destructive text-sm">{errorMessage}</div>}
      <Button type="submit" disabled={isProcessing || !stripe || !elements} className="w-full">
        {isProcessing ? 'Processing...' : `Subscribe for $${planPrice} / ${planName}`}
      </Button>
    </form>
  );
};

const SubscriptionCheckout = () => {
  const { subscriptionId } = useParams();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await api.get(`/api/subscriptions/${subscriptionId}`);
        const { subscription, clientSecret: apiSecret } = res.data;
        
        if (!subscription) {
          router.push('/dashboard');
          return;
        }
        setSubscriptionData(subscription);
        
        if (apiSecret) {
          setClientSecret(apiSecret);
        } else if (subscription.status !== 'INACTIVE') {
          setErrorMessage('This subscription is already ' + subscription.status.toLowerCase());
        } else {
          setErrorMessage('Payment session expired or could not be retrieved. Please try subscribing again.');
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to load subscription details.');
      }
    };
    fetchSubscription();
  }, [subscriptionId, router]);


  if (errorMessage) {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-muted-foreground mb-8">{errorMessage}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!clientSecret || !subscriptionData) {
    return <div className="container mx-auto max-w-md py-20 text-center">Loading checkout...</div>;
  }

  const isMonthly = subscriptionData.plan === 'MONTHLY';
  const planPrice = isMonthly ? subscriptionData.tutor.tutorProfile.subscriptionMonthlyPrice : subscriptionData.tutor.tutorProfile.subscriptionYearlyPrice;
  const planName = isMonthly ? 'month' : 'year';

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Subscription</CardTitle>
          <CardDescription>
            {isMonthly ? 'Monthly' : 'Yearly'} Plan with {subscriptionData.tutor.email.split('@')[0]}
            <br />
            Renews automatically every {planName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm planPrice={planPrice} planName={planName} subscriptionId={subscriptionId as string} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCheckout;
