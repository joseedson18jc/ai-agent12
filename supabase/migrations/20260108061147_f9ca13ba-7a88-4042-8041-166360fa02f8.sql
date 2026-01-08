-- Create financial_metrics table for real-time KPIs
CREATE TABLE public.financial_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'ebitda', 'net_income', 'gross_profit', 'opex', 'cogs')),
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  cost_center TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_anomalies table for AI-detected alerts
CREATE TABLE public.financial_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metric_type TEXT,
  current_value DECIMAL(15,2),
  expected_value DECIMAL(15,2),
  deviation_percent DECIMAL(5,2),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create push_subscriptions table for browser push notifications
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on all tables
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_metrics
CREATE POLICY "Users can view their own metrics" 
  ON public.financial_metrics 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
  ON public.financial_metrics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
  ON public.financial_metrics 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics" 
  ON public.financial_metrics 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for financial_anomalies
CREATE POLICY "Users can view their own anomalies" 
  ON public.financial_anomalies 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anomalies" 
  ON public.financial_anomalies 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anomalies" 
  ON public.financial_anomalies 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own anomalies" 
  ON public.financial_anomalies 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for push_subscriptions
CREATE POLICY "Users can view their own push subscriptions" 
  ON public.push_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" 
  ON public.push_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
  ON public.push_subscriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable realtime for metrics and anomalies
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_anomalies;

-- Create updated_at trigger for financial_metrics
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_financial_metrics_updated_at
  BEFORE UPDATE ON public.financial_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();