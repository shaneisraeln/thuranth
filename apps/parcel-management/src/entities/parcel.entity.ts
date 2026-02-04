import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ParcelStatus, Priority, GeoCoordinate, Address, ContactInfo, Dimensions } from '@pdcp/types';

@Entity('parcels')
@Index(['trackingNumber'], { unique: true })
@Index(['status'])
@Index(['assignedVehicleId'])
@Index(['slaDeadline'])
@Index(['priority'])
@Index(['createdAt'])
export class ParcelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tracking_number', unique: true })
  trackingNumber: string;

  // Sender information
  @Column({ name: 'sender_name' })
  senderName: string;

  @Column({ name: 'sender_phone' })
  senderPhone: string;

  @Column({ name: 'sender_email', nullable: true })
  senderEmail?: string;

  @Column({ name: 'sender_address_street' })
  senderAddressStreet: string;

  @Column({ name: 'sender_address_city' })
  senderAddressCity: string;

  @Column({ name: 'sender_address_state' })
  senderAddressState: string;

  @Column({ name: 'sender_address_postal_code' })
  senderAddressPostalCode: string;

  @Column({ name: 'sender_address_country' })
  senderAddressCountry: string;

  // Recipient information
  @Column({ name: 'recipient_name' })
  recipientName: string;

  @Column({ name: 'recipient_phone' })
  recipientPhone: string;

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail?: string;

  @Column({ name: 'recipient_address_street' })
  recipientAddressStreet: string;

  @Column({ name: 'recipient_address_city' })
  recipientAddressCity: string;

  @Column({ name: 'recipient_address_state' })
  recipientAddressState: string;

  @Column({ name: 'recipient_address_postal_code' })
  recipientAddressPostalCode: string;

  @Column({ name: 'recipient_address_country' })
  recipientAddressCountry: string;

  // Location information (stored as JSON for simplicity)
  @Column({ name: 'pickup_location', type: 'jsonb' })
  pickupLocation: GeoCoordinate;

  @Column({ name: 'delivery_location', type: 'jsonb' })
  deliveryLocation: GeoCoordinate;

  // Parcel details
  @Column({ name: 'sla_deadline', type: 'timestamp with time zone' })
  slaDeadline: Date;

  @Column({ name: 'weight', type: 'decimal', precision: 10, scale: 2 })
  weight: number;

  @Column({ name: 'length_cm', type: 'decimal', precision: 8, scale: 2 })
  lengthCm: number;

  @Column({ name: 'width_cm', type: 'decimal', precision: 8, scale: 2 })
  widthCm: number;

  @Column({ name: 'height_cm', type: 'decimal', precision: 8, scale: 2 })
  heightCm: number;

  @Column({ name: 'value_amount', type: 'decimal', precision: 12, scale: 2 })
  valueAmount: number;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  // Assignment information
  @Column({
    name: 'status',
    type: 'enum',
    enum: ParcelStatus,
    default: ParcelStatus.PENDING,
  })
  status: ParcelStatus;

  @Column({ name: 'assigned_vehicle_id', nullable: true })
  assignedVehicleId?: string;

  @Column({ name: 'assigned_at', type: 'timestamp with time zone', nullable: true })
  assignedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  get sender(): ContactInfo {
    return {
      name: this.senderName,
      phone: this.senderPhone,
      email: this.senderEmail,
      address: {
        street: this.senderAddressStreet,
        city: this.senderAddressCity,
        state: this.senderAddressState,
        postalCode: this.senderAddressPostalCode,
        country: this.senderAddressCountry,
      },
    };
  }

  get recipient(): ContactInfo {
    return {
      name: this.recipientName,
      phone: this.recipientPhone,
      email: this.recipientEmail,
      address: {
        street: this.recipientAddressStreet,
        city: this.recipientAddressCity,
        state: this.recipientAddressState,
        postalCode: this.recipientAddressPostalCode,
        country: this.recipientAddressCountry,
      },
    };
  }

  get dimensions(): Dimensions {
    return {
      length: this.lengthCm,
      width: this.widthCm,
      height: this.heightCm,
      volume: this.lengthCm * this.widthCm * this.heightCm,
    };
  }

  // Helper methods for setting contact info
  setSender(sender: ContactInfo): void {
    this.senderName = sender.name;
    this.senderPhone = sender.phone;
    this.senderEmail = sender.email;
    this.senderAddressStreet = sender.address.street;
    this.senderAddressCity = sender.address.city;
    this.senderAddressState = sender.address.state;
    this.senderAddressPostalCode = sender.address.postalCode;
    this.senderAddressCountry = sender.address.country;
  }

  setRecipient(recipient: ContactInfo): void {
    this.recipientName = recipient.name;
    this.recipientPhone = recipient.phone;
    this.recipientEmail = recipient.email;
    this.recipientAddressStreet = recipient.address.street;
    this.recipientAddressCity = recipient.address.city;
    this.recipientAddressState = recipient.address.state;
    this.recipientAddressPostalCode = recipient.address.postalCode;
    this.recipientAddressCountry = recipient.address.country;
  }

  setDimensions(dimensions: Dimensions): void {
    this.lengthCm = dimensions.length;
    this.widthCm = dimensions.width;
    this.heightCm = dimensions.height;
  }
}