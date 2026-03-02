import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('bots')
export class Bot {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'seller_id' }) sellerId: string;
  @Column({ length: 200 }) name: string;
  @Column({ length: 200, unique: true }) slug: string;
  @Column({ name: 'short_description', length: 500, nullable: true }) shortDescription: string;
  @Column({ nullable: true, type: 'text' }) description: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ name: 'mt_platform' }) mtPlatform: string;
  @Column({ name: 'currency_pairs', type: 'text', array: true, default: [] }) currencyPairs: string[];
  @Column({ type: 'text', array: true, default: [] }) timeframes: string[];
  @Column({ name: 'risk_level', nullable: true, type: 'smallint' }) riskLevel: number;
  @Column({ name: 'is_verified', default: false }) isVerified: boolean;
  @Column({ name: 'verified_at', nullable: true }) verifiedAt: Date;
  @Column({ name: 'total_subscribers', default: 0 }) totalSubscribers: number;
  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, nullable: true }) avgRating: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date;
}
