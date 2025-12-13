import { faker } from "@faker-js/faker";

export function randomFullName(): {
  first: string;
  middle: string;
  last: string;
  full: string;
} {
  const first = faker.person.firstName();
  const middle = faker.person.middleName();
  const last = faker.person.lastName();
  
  return {
    first,
    middle,
    last,
    full: `${first} ${middle} ${last}`,
  };
}

export function generateEmployeeData() {
  const company = faker.company.name();
  const jobTitle = faker.person.jobTitle();

  // Start date between 2010–2024 (customize as you want)
  const startDate = faker.date.past({ years: 15 });
  const formattedStartDate = startDate.toISOString().split('T')[0]; // yyyy-MM-dd

  // Monthly salary between 2000–8000 USD
  const monthlySalary = faker.number.int({ min: 2000, max: 8000 });

  return {
    company,
    jobTitle,
    startDate: formattedStartDate,
    monthlySalary,
  };
}
