import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'subscription_id', nullable: true }) subscriptionId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'amount_cents' }) amountCents: number;
  @Column({ length: 3, default: 'USD' }) currency: string;
  @Column({ name: 'platform_fee_cents', default: 0 }) platformFeeCents: number;
  @Column({ name: 'seller_payout_cents', default: 0 }) sellerPayoutCents: number;
  @Column({ name: 'stripe_payment_intent_id', unique: true, nullable: true }) stripePaymentIntentId: string;
  @Column({ name: 'stripe_charge_id', nullable: true }) stripeChargeId: string;
  @Column({ name: 'failure_code', nullable: true }) failureCode: string;
  @Column({ name: 'failure_message', nullable: true }) failureMessage: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
