interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  return (
    <section className="subject-page">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
};

export default PlaceholderPage;
