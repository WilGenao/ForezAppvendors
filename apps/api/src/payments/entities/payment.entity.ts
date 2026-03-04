import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  botListingId: string;

  @Column()
  listingType: string;

  @Column()
  stripeSessionId: string;

  @Column()
  status: string; // pending | completed | expired

  @Column('int')
  amount: number; // en centavos

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}