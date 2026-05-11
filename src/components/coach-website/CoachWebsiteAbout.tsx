interface Props {
  aboutText: string;
}

const CoachWebsiteAbout = ({ aboutText }: Props) => (
  <section id="cw-about" className="border-b border-border py-14">
    <div className="container mx-auto px-4">
      <h2 className="mb-4 text-2xl font-bold text-foreground">About Us</h2>
      <p className="max-w-3xl whitespace-pre-line text-muted-foreground leading-relaxed">{aboutText}</p>
    </div>
  </section>
);

export default CoachWebsiteAbout;
