import {
  registerSchema,
  loginSchema,
  addressSchema,
  dogSchema,
  createBookingSchema,
  reviewSchema,
} from '../middleware/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.de',
        password: 'Password123',
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+49 171 1234567',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'Max',
        lastName: 'Mustermann',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.de',
        password: 'weak',
        firstName: 'Max',
        lastName: 'Mustermann',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require uppercase in password', () => {
      const invalidData = {
        email: 'test@example.de',
        password: 'password123',
        firstName: 'Max',
        lastName: 'Mustermann',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.de',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.de',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('addressSchema', () => {
    it('should validate correct address', () => {
      const validData = {
        street: 'Hauptstraße',
        houseNumber: '42a',
        postalCode: '10115',
        city: 'Berlin',
        latitude: 52.5200,
        longitude: 13.4050,
      };

      const result = addressSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid postal code', () => {
      const invalidData = {
        street: 'Hauptstraße',
        houseNumber: '42',
        postalCode: '1234', // Should be 5 digits
        city: 'Berlin',
      };

      const result = addressSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid coordinates', () => {
      const invalidData = {
        street: 'Hauptstraße',
        houseNumber: '42',
        postalCode: '10115',
        city: 'Berlin',
        latitude: 200, // Invalid
        longitude: 13.4050,
      };

      const result = addressSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('dogSchema', () => {
    it('should validate correct dog data', () => {
      const validData = {
        name: 'Bello',
        breed: 'Labrador',
        age: 5,
        weight: 28.5,
        size: 'groß',
        isVaccinated: true,
      };

      const result = dogSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid size', () => {
      const invalidData = {
        name: 'Bello',
        breed: 'Labrador',
        age: 5,
        weight: 28.5,
        size: 'riesig', // Invalid
      };

      const result = dogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid age', () => {
      const invalidData = {
        name: 'Bello',
        breed: 'Labrador',
        age: -1, // Invalid
        weight: 28.5,
        size: 'groß',
      };

      const result = dogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createBookingSchema', () => {
    it('should validate correct booking data', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const validData = {
        addressId: 'clm1234567890abcdefghij',
        dogIds: ['clm1234567890abcdefghij'],
        scheduledDate: futureDate.toISOString(),
        duration: 60,
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        addressId: 'clm1234567890abcdefghij',
        dogIds: ['clm1234567890abcdefghij'],
        scheduledDate: pastDate.toISOString(),
        duration: 60,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty dogIds', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const invalidData = {
        addressId: 'clm1234567890abcdefghij',
        dogIds: [],
        scheduledDate: futureDate.toISOString(),
        duration: 60,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid duration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const invalidData = {
        addressId: 'clm1234567890abcdefghij',
        dogIds: ['clm1234567890abcdefghij'],
        scheduledDate: futureDate.toISOString(),
        duration: 15, // Min is 30
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewSchema', () => {
    it('should validate correct review', () => {
      const validData = {
        rating: 5,
        comment: 'Sehr guter Service!',
      };

      const result = reviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid rating', () => {
      const invalidData = {
        rating: 6, // Max is 5
      };

      const result = reviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow review without comment', () => {
      const validData = {
        rating: 4,
      };

      const result = reviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
