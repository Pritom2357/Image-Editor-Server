const formatServicePath = (path) => {
    if (!path) return 'Unknown Service';

    const segments = path.split('/');
    const serviceSlug = segments[1];

    // console.log(segments);    

    if (!serviceSlug) return 'Unknown Service';

    return serviceSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

module.exports = formatServicePath;
