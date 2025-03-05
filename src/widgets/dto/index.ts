export * from './create-widget.dto';
export * from './update-widget.dto';
export * from './search.dto';

export const defaultKitOptions: {
    color: string;
    fontFamily: string;
    logoUrl: string;
} = {
    color: '#9C5AFF,#3EA8FF,#98D0E6,#FFC19E,#FF81A4',
    fontFamily: 'Inter,Helvetica,Roboto,Sans Serif',
    logoUrl: `${process.env.MEDIA_STORAGE_DOMAIN}/public/defaultBrandKitLogo.png`,
}