import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'subscription_id' }) subscriptionId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'bot_id' }) botId: string;
  @Column({ name: 'bot_version_id' }) botVersionId: string;
  @Column({ name: 'license_key', unique: true }) licenseKey: string;
  @Column({ default: 'active' }) status: string;
  @Column({ name: 'max_activations', default: 1 }) maxActivations: number;
  @Column({ name: 'current_activations', default: 0 }) currentActivations: number;
  @Column({ name: 'hwid_hash', type: 'text', array: true, nullable: true }) hwidHash: string[];
  @Column({ name: 'expires_at', nullable: true }) expiresAt: Date;
  @Column({ name: 'last_validated_at', nullable: true }) lastValidatedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
